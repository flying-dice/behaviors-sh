// Loop verbs that drive an execution through the runtime protocol.
//
// MCP tool handlers in `register-runtime-tools.ts` are 2–4 line shims
// over these `core*` functions; the same functions are reused by tests
// and any future CLI entry points. The driving loop is:
//
//   1.  `coreNext` is replay-safe — calling it while phase is
//       `evaluating` / `performing` / `protocol` re-emits the pending
//       request instead of advancing. Only `coreEval` / `coreSubmit`
//       move the cursor.
//
//   2.  Before any tree work, the runtime gates on
//       `protocol_accepted`. While false, `coreNext` returns the
//       synthetic `Acknowledge_Protocol` instruct; `coreSubmit` with
//       `success` toggles the gate and unblocks the tree, with
//       `failure` aborts the execution.
//
//   3.  `coreEval(true)` advances `step_index += 1` within an action;
//       `coreEval(false)` marks the action a failure. Selectors /
//       sequences pick that up on the next `coreNext`.
//
//   4.  `coreSubmit("success")` advances the step; if no steps remain
//       in the current action the action is closed as success.
//       `coreSubmit("failure")` closes the action as failure.
//       `coreSubmit("running")` is a yield — appends trace, leaves
//       cursor in place.
//
// All state mutations go through `Runtime.executionStore` /
// `Runtime.runtimeStore`; this module owns no persistent state.

import {
	decodeCursor,
	type ExecutionDocument,
	type ExecutionPhase,
	encodeCursor,
	getNodeAtPath,
	INITIAL_CURSOR,
	type NormalizedNode,
	NULL_CURSOR,
	type Runtime,
	type TickResult,
	type TraceEntry,
	type TraceKind,
} from "@behaviors-sh/runtime";

export const PROTOCOL_GATE_NAME = "Acknowledge_Protocol";

// The protocol-gate instruction text. Kept short on purpose — the MCP
// host already knows it's bound to the tool surface; this is the
// behavioural contract the agent must accept before the runtime will
// surface real tree steps.
const PROTOCOL_GATE_INSTRUCTION =
	"Read the runtime protocol below in full. It is the binding contract for the rest of this execution.\n\n" +
	"You drive a behaviour tree by calling MCP tools on the `behaviors-sh` server:\n" +
	"  - `next_step(trace_output)` returns the next request (an evaluate, an instruct, or a terminal done/failure). It is replay-safe — calling it again while a step is in flight returns the same request.\n" +
	"  - For an `evaluate`, call `eval(trace_output, result, note?)` with a boolean.\n" +
	"  - For an `instruct`, call `submit(trace_output, status, note?)` with `success`, `failure`, or `running`. `success` advances within the action and completes it on the last step; `failure` fails the action; `running` is a yield that keeps the cursor in place.\n" +
	"  - State lives in `$VAR` and `$CONST`. Read with `var_read` / `const_read`, write with `var_write`. Never substitute values from your own context — always read from the store.\n" +
	"  - Use `think(trace_output, thought)` to record a checkpoint thought mid-action without advancing.\n\n" +
	"Submit success to acknowledge and proceed; submit failure to abort.";

function buildProtocolGate() {
	return {
		type: "instruct" as const,
		name: PROTOCOL_GATE_NAME,
		instruction: PROTOCOL_GATE_INSTRUCTION,
	};
}

function loadDoc(runtime: Runtime, uri: string): ExecutionDocument {
	const doc = runtime.executionStore.findByUri(uri);
	if (!doc) throw new Error(`Execution not found: ${uri}`);
	return doc;
}

function rootOrThrow(doc: ExecutionDocument): NormalizedNode {
	if (doc.tree.type === "ref") {
		throw new Error("tree root is a ref node — cannot tick");
	}
	return doc.tree as NormalizedNode;
}

function appendTrace(
	runtime: Runtime,
	uri: string,
	kind: TraceKind,
	cursor: string,
	name: string,
	submitted: string,
	outcome: string,
	note?: string,
): void {
	const entry: TraceEntry = {
		ts: new Date().toISOString(),
		kind,
		cursor,
		name,
		submitted,
		outcome,
		...(note ? { note } : {}),
	};
	runtime.executionStore.appendTrace(uri, entry);
}

function setPhase(
	runtime: Runtime,
	uri: string,
	phase: ExecutionPhase,
	cursor = NULL_CURSOR,
): void {
	runtime.executionStore.update(uri, { phase, cursor });
}

// Re-emit whatever request the doc's current phase says is in flight.
// Used both by `next_step` (replay) and to surface the protocol gate
// without re-mutating state.
function buildReplay(doc: ExecutionDocument) {
	if (doc.phase === "protocol") return buildProtocolGate();

	const cursor = decodeCursor(doc.cursor);
	if (!cursor) throw new Error("cursor missing for replay");
	const root = rootOrThrow(doc);
	const node = getNodeAtPath(root, cursor.path);
	if (node.type !== "action") {
		throw new Error("cursor points to non-action node");
	}
	const step = node.steps[cursor.step];
	if (!step) {
		throw new Error(`cursor.step out of range for phase ${doc.phase}`);
	}
	if (doc.phase === "evaluating" && step.kind === "evaluate") {
		return {
			type: "evaluate" as const,
			name: node.name,
			expression: step.expression,
		};
	}
	if (doc.phase === "performing" && step.kind === "instruct") {
		return {
			type: "instruct" as const,
			name: node.name,
			instruction: step.instruction,
		};
	}
	throw new Error(`cursor.step kind mismatch for phase ${doc.phase}`);
}

function applyTickResult(runtime: Runtime, uri: string, result: TickResult) {
	if (result.type === "done") {
		runtime.executionStore.update(uri, {
			status: "complete",
			phase: "idle",
			cursor: NULL_CURSOR,
		});
		return { status: "done" as const };
	}
	if (result.type === "failure") {
		runtime.executionStore.update(uri, {
			status: "failed",
			phase: "idle",
			cursor: NULL_CURSOR,
		});
		return { status: "failure" as const };
	}
	const cur = encodeCursor({ path: result.path, step: result.step });
	if (result.type === "evaluate") {
		runtime.executionStore.update(uri, {
			status: "running",
			phase: "evaluating",
			cursor: cur,
		});
		return {
			type: "evaluate" as const,
			name: result.name,
			expression: result.expression,
		};
	}
	runtime.executionStore.update(uri, {
		status: "running",
		phase: "performing",
		cursor: cur,
	});
	return {
		type: "instruct" as const,
		name: result.name,
		instruction: result.instruction,
	};
}

// ── Loop verbs ──────────────────────────────────────────────────────────

export function coreNext(runtime: Runtime, uri: string) {
	const doc = loadDoc(runtime, uri);

	if (!doc.protocol_accepted) {
		// Sticky: once we're in the protocol phase we stay there until
		// `submit` resolves it.
		if (doc.phase !== "protocol") setPhase(runtime, uri, "protocol");
		return buildProtocolGate();
	}

	if (doc.phase === "evaluating" || doc.phase === "performing") {
		return buildReplay(doc);
	}

	const root = rootOrThrow(doc);
	const result = runtime.tick.tickRoot(uri, root);
	return applyTickResult(runtime, uri, result);
}

export function coreEval(
	runtime: Runtime,
	uri: string,
	result: boolean,
	note?: string,
) {
	const doc = loadDoc(runtime, uri);
	if (doc.phase !== "evaluating") {
		throw new Error(
			`Execution is not in evaluating phase (current: ${doc.phase})`,
		);
	}

	const cursor = decodeCursor(doc.cursor);
	if (!cursor) throw new Error("cursor missing");
	const { path, step } = cursor;
	const cursorBefore = doc.cursor;

	const root = rootOrThrow(doc);
	const node = getNodeAtPath(root, path);
	if (node.type === "ref") throw new Error("cursor points to ref node");
	const nodeName = node.name;

	if (result) {
		runtime.runtimeStore.setStep(uri, path, step + 1);
		setPhase(runtime, uri, "idle");
		appendTrace(
			runtime,
			uri,
			"evaluate",
			cursorBefore,
			nodeName,
			"true",
			"evaluation_passed",
			note,
		);
		return {
			status: "evaluation_passed" as const,
			message: "Precondition met. Advancing.",
		};
	}

	runtime.runtimeStore.setStatus(uri, path, "failure");
	setPhase(runtime, uri, "idle");
	appendTrace(
		runtime,
		uri,
		"evaluate",
		cursorBefore,
		nodeName,
		"false",
		"evaluation_failed",
		note,
	);
	return {
		status: "evaluation_failed" as const,
		message: "Precondition not met. Action failed.",
	};
}

export function coreSubmit(
	runtime: Runtime,
	uri: string,
	status: "success" | "failure" | "running",
	note?: string,
) {
	const doc = loadDoc(runtime, uri);

	if (doc.phase === "protocol") {
		return runProtocolSubmit(runtime, uri, doc, status, note);
	}

	if (doc.phase !== "performing") {
		throw new Error(
			`Execution is not in performing phase (current: ${doc.phase})`,
		);
	}

	return runPerformingSubmit(runtime, uri, doc, status, note);
}

function runProtocolSubmit(
	runtime: Runtime,
	uri: string,
	doc: ExecutionDocument,
	status: "success" | "failure" | "running",
	note?: string,
) {
	const cursorBefore = doc.cursor;
	const submitted =
		status === "success"
			? "accept"
			: status === "failure"
				? "reject"
				: "running";

	if (status === "running") {
		appendTrace(
			runtime,
			uri,
			"protocol",
			cursorBefore,
			PROTOCOL_GATE_NAME,
			submitted,
			"running",
			note,
		);
		return {
			status: "running" as const,
			message: "Acknowledged. Call next_step when ready to continue.",
		};
	}

	if (status === "success") {
		runtime.executionStore.update(uri, {
			protocol_accepted: true,
			phase: "idle",
			cursor: NULL_CURSOR,
		});
		appendTrace(
			runtime,
			uri,
			"protocol",
			cursorBefore,
			PROTOCOL_GATE_NAME,
			submitted,
			"protocol_accepted",
			note,
		);
		return {
			status: "protocol_accepted" as const,
			message: "Protocol acknowledged. Call next_step to begin the tree.",
		};
	}

	runtime.executionStore.update(uri, {
		status: "failed",
		phase: "idle",
		cursor: NULL_CURSOR,
	});
	appendTrace(
		runtime,
		uri,
		"protocol",
		cursorBefore,
		PROTOCOL_GATE_NAME,
		submitted,
		"protocol_rejected",
		note,
	);
	return {
		status: "protocol_rejected" as const,
		message: "Protocol not acknowledged. Execution aborted.",
	};
}

function runPerformingSubmit(
	runtime: Runtime,
	uri: string,
	doc: ExecutionDocument,
	status: "success" | "failure" | "running",
	note?: string,
) {
	const cursor = decodeCursor(doc.cursor);
	if (!cursor) throw new Error("cursor missing");
	const { path, step } = cursor;
	const cursorBefore = doc.cursor;
	const root = rootOrThrow(doc);
	const node = getNodeAtPath(root, path);
	if (node.type !== "action") {
		throw new Error("cursor points to non-action node");
	}
	const nodeName = node.name;

	if (status === "running") {
		appendTrace(
			runtime,
			uri,
			"instruct",
			cursorBefore,
			nodeName,
			"running",
			"running",
			note,
		);
		return {
			status: "running" as const,
			message: "Acknowledged. Call next_step when ready to continue.",
		};
	}

	if (status === "failure") {
		runtime.runtimeStore.setStatus(uri, path, "failure");
		setPhase(runtime, uri, "idle");
		appendTrace(
			runtime,
			uri,
			"instruct",
			cursorBefore,
			nodeName,
			"failure",
			"action_failed",
			note,
		);
		return {
			status: "action_failed" as const,
			message: "Instruction failed. Action marked as failure.",
		};
	}

	const nextStep = step + 1;
	if (nextStep >= node.steps.length) {
		runtime.runtimeStore.setStatus(uri, path, "success");
		setPhase(runtime, uri, "idle");
		appendTrace(
			runtime,
			uri,
			"instruct",
			cursorBefore,
			nodeName,
			"success",
			"action_complete",
			note,
		);
		return {
			status: "action_complete" as const,
			message: "All steps done. Action succeeded.",
		};
	}

	runtime.runtimeStore.setStep(uri, path, nextStep);
	setPhase(runtime, uri, "idle");
	appendTrace(
		runtime,
		uri,
		"instruct",
		cursorBefore,
		nodeName,
		"success",
		"step_complete",
		note,
	);
	return {
		status: "step_complete" as const,
		message: "Step done. More steps remain.",
	};
}

export function coreThink(runtime: Runtime, uri: string, thought: string) {
	const doc = loadDoc(runtime, uri);
	if (doc.cursor === NULL_CURSOR || doc.phase === "protocol") {
		throw new Error("cannot think: no action in flight");
	}
	const cursor = decodeCursor(doc.cursor);
	if (!cursor) throw new Error("cursor missing");
	const root = rootOrThrow(doc);
	const node = getNodeAtPath(root, cursor.path);
	if (node.type === "ref") throw new Error("cursor points to ref node");
	appendTrace(
		runtime,
		uri,
		"think",
		doc.cursor,
		node.name,
		"thought",
		"recorded",
		thought,
	);
	return { status: "recorded" as const };
}

// ── Scope I/O ───────────────────────────────────────────────────────────

export function coreVarRead(runtime: Runtime, uri: string, path?: string) {
	const value = runtime.executionStore.getScope(uri, "var", path);
	return path ? { path, value } : value;
}

// `value` is JSON-parsed when possible; otherwise stored as a string
// literal — so agents can write either `"42"` or `42` without
// thinking about quoting.
export function coreVarWrite(
	runtime: Runtime,
	uri: string,
	path: string,
	value: string,
) {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		parsed = value;
	}
	runtime.executionStore.setScope(uri, "var", path, parsed);
	return { path, value: parsed };
}

export function coreConstRead(runtime: Runtime, uri: string, path?: string) {
	const value = runtime.executionStore.getScope(uri, "const", path);
	return path ? { path, value } : value;
}

// ── Reset ───────────────────────────────────────────────────────────────

// Rewind the trace, scopes, runtime bookkeeping, and the protocol
// gate. Used when the agent wants to re-attempt a run against the
// same trace file without creating a new URI.
export function coreReset(runtime: Runtime, uri: string) {
	const doc = loadDoc(runtime, uri);
	const rootState = doc.tree.type !== "ref" ? (doc.tree.state ?? {}) : {};
	runtime.executionStore.replaceScope(uri, "var", { ...(rootState.var ?? {}) });
	runtime.executionStore.replaceScope(uri, "const", {
		...(rootState.const ?? {}),
	});
	runtime.runtimeStore.reset(uri);
	runtime.executionStore.update(uri, {
		status: "running",
		phase: "idle",
		cursor: INITIAL_CURSOR,
		protocol_accepted: false,
		trace: [],
	});
	return { status: "reset" as const };
}
