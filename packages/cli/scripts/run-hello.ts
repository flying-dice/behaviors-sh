// In-process driver for the Hello_World tree, exercising the same
// verbs the MCP tool layer wraps. Used as a sanity check that
// `next_step` / `eval` / `submit` / `var_write` / `var_read` work
// end-to-end against the file:// writer.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildRuntime,
	FileSystemExecutionReader,
	FileSystemExecutionWriter,
	FileSystemTreeReader,
	INITIAL_CURSOR,
} from "@behaviors-sh/runtime";
import { helloWorld } from "../../../trees/hello-world/src/index.ts";
import {
	coreEval,
	coreNext,
	coreSubmit,
	coreVarRead,
	coreVarWrite,
} from "../src/mcp/verbs.ts";

const cwd = process.cwd();
const treePath = resolve(cwd, ".behaviors-sh/trees/hello-world.json");
const executionsDir = resolve(cwd, ".behaviors-sh/executions");

writeFileSync(treePath, helloWorld.toJson());
console.log("[seed] wrote tree →", treePath);

const treeUri = pathToFileURL(treePath).href;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const uri = pathToFileURL(
	resolve(executionsDir, `hello-world-verbs-${stamp}.json`),
).href;

const runtime = buildRuntime({
	trees: new FileSystemTreeReader({ cwd }),
	executionsRead: new FileSystemExecutionReader({ executionsDir }),
	executionsWrite: new FileSystemExecutionWriter(),
});

const loaded = await runtime.loadTree(treeUri);
if (!loaded) throw new Error(`could not load tree at ${treeUri}`);
const now = new Date().toISOString();
runtime.executionStore.create({
	uri,
	tree_uri: treeUri,
	tree: loaded.parsed,
	status: "running",
	phase: "idle",
	cursor: INITIAL_CURSOR,
	protocol_accepted: false,
	created_at: now,
	updated_at: now,
});
console.log("[start] execution →", uri);

// Stateless decision helper: given a tick result, decide what the agent
// would say. Returns either { eval: boolean } or { submit: status }.
// Side-effects (e.g. writing $VAR) happen as we go.
type Verb =
	| { kind: "eval"; result: boolean; note?: string }
	| { kind: "submit"; status: "success" | "failure"; note?: string };

function decide(req: ReturnType<typeof coreNext>): Verb {
	if (!("type" in req)) throw new Error("terminal already; should not decide");

	if (req.type === "evaluate") {
		const expr = req.expression;
		const read = coreVarRead(runtime, uri, "Hello_World__time_of_day") as {
			path: string;
			value: unknown;
		};
		const tod = read.value;
		if (expr.includes('"morning"'))
			return { kind: "eval", result: tod === "morning" };
		if (expr.includes('"afternoon"'))
			return { kind: "eval", result: tod === "afternoon" };
		if (expr.includes('"evening"'))
			return { kind: "eval", result: tod === "evening" };
		// "is set" gates etc.
		return { kind: "eval", result: true };
	}

	// instruct
	if (req.name === "Acknowledge_Protocol") {
		return { kind: "submit", status: "success", note: "protocol understood" };
	}
	if (req.name === "Determine_Time") {
		coreVarWrite(runtime, uri, "Hello_World__time_of_day", '"morning"');
		return {
			kind: "submit",
			status: "success",
			note: "date → 00:32 → morning (rule: before 12:00 = morning)",
		};
	}
	if (req.name === "Morning_Greeting") {
		coreVarWrite(
			runtime,
			uri,
			"Hello_World__greeting",
			'"Good morning, jonathanturnock — hope today goes smoothly."',
		);
		return { kind: "submit", status: "success" };
	}
	return { kind: "submit", status: "success" };
}

let safety = 60;
while (safety-- > 0) {
	const req = coreNext(runtime, uri);

	if ("status" in req && req.status === "done") {
		console.log("[final] done");
		break;
	}
	if ("status" in req && req.status === "failure") {
		console.log("[final] failure");
		break;
	}

	if (!("type" in req))
		throw new Error(`unexpected response: ${JSON.stringify(req)}`);

	const tag =
		req.type === "evaluate" ? `evaluate ${req.name}` : `instruct ${req.name}`;
	const verb = decide(req);

	if (verb.kind === "eval") {
		console.log(`[tick] ${tag} → eval(${verb.result})`);
		coreEval(runtime, uri, verb.result, verb.note);
	} else {
		console.log(`[tick] ${tag} → submit(${verb.status})`);
		coreSubmit(runtime, uri, verb.status, verb.note);
	}
}

const final = runtime.executionStore.findByUri(uri);
console.log(
	"\n[final] status =",
	final?.status,
	"· phase =",
	final?.phase,
	"· trace entries =",
	final?.trace.length,
);
console.log("[final] $VAR →", JSON.stringify(final?.var));
console.log("[final] trace file →", uri);
