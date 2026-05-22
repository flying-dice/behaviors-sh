// The tick engine: advances an execution one tick at a time, honouring
// sequence/selector/parallel/action semantics and retry budgets.
//
// Internal bookkeeping (per-node status, step index, retry counters)
// lives in the execution document's `runtime` field — never in $VAR —
// so it isn't exposed by `var read` and can't be mutated by `var write`.
// The tick engine owns it.

import type { RuntimeStore } from "./runtime-store.ts";
import type { NodeStatus, NormalizedNode, TickResult } from "./types.ts";

export interface Tick {
	tickRoot(uri: string, root: NormalizedNode): TickResult;
	tickNode(uri: string, path: number[], node: NormalizedNode): TickResult;
	getNodeResult(uri: string, path: number[]): NodeStatus | null;
	setNodeResult(uri: string, path: number[], status: NodeStatus): void;
	getStepIndex(uri: string, path: number[]): number;
	setStepIndex(uri: string, path: number[], step: number): void;
}

export function createTick(runtimeStore: RuntimeStore): Tick {
	function getNodeResult(uri: string, path: number[]): NodeStatus | null {
		return runtimeStore.getStatus(uri, path);
	}

	function setNodeResult(uri: string, path: number[], status: NodeStatus) {
		runtimeStore.setStatus(uri, path, status);
	}

	function getStepIndex(uri: string, path: number[]): number {
		return runtimeStore.getStep(uri, path);
	}

	function setStepIndex(uri: string, path: number[], step: number) {
		runtimeStore.setStep(uri, path, step);
	}

	// If `node` has a retries config and we haven't exhausted it, reset
	// the node's runtime state (status, step index, descendants) and bump
	// the retry counter. Returns true if a retry was consumed and the
	// caller should treat the node as unstarted; false if the failure
	// should stand.
	//
	// Intentionally NOT touching $VAR — user-written keys (counter,
	// review_notes, draft, etc.) persist across retries because that's how
	// the next attempt sees what the previous one produced.
	function maybeRetry(
		uri: string,
		path: number[],
		node: NormalizedNode,
	): boolean {
		if (node.type === "ref") return false;
		const retries = node.retries ?? 0;
		if (retries <= 0) return false;
		const attempts = runtimeStore.getRetryCount(uri, path);
		if (attempts >= retries) return false;
		runtimeStore.incrementRetryCount(uri, path);
		runtimeStore.resetSubtree(uri, path);
		return true;
	}

	// Top-level entry point. Handles retries on the ROOT node, where
	// there's no parent to detect failure and apply maybeRetry on the
	// child's behalf. Composite-internal retries are still handled inside
	// tickNode via the per-child status checks.
	function tickRoot(uri: string, root: NormalizedNode): TickResult {
		let result = tickNode(uri, [], root);
		while (result.type === "failure" && maybeRetry(uri, [], root)) {
			result = tickNode(uri, [], root);
		}
		return result;
	}

	function tickNode(
		uri: string,
		path: number[],
		node: NormalizedNode,
	): TickResult {
		if (!node) return { type: "done" };

		if (node.type === "ref") {
			// Cyclic $ref preserved at execution-create time. We can't
			// traverse a cycle, so fail cleanly with a marker so the caller
			// can see what broke.
			console.error(
				`runtime: cyclic ref '${node.ref}' encountered at path [${path.join(",")}] — cannot tick. Marking action as failure.`,
			);
			return { type: "failure" };
		}

		if (node.type === "action") {
			let status = getNodeResult(uri, path);
			if (status === "failure" && maybeRetry(uri, path, node)) {
				status = null; // subtree state was wiped — restart this action's steps
			}
			if (status === "success" || status === "failure") {
				return { type: status === "success" ? "done" : "failure" };
			}
			const stepIdx = getStepIndex(uri, path);
			if (!node.steps || stepIdx >= node.steps.length) return { type: "done" };
			const step = node.steps[stepIdx];
			if (!step) return { type: "done" };
			if (step.kind === "evaluate") {
				return {
					type: "evaluate",
					name: node.name,
					expression: step.expression,
					path,
					step: stepIdx,
				};
			}
			return {
				type: "instruct",
				name: node.name,
				instruction: step.instruction,
				path,
				step: stepIdx,
			};
		}

		if (node.type === "sequence") {
			for (let i = 0; i < node.children.length; i++) {
				const childPath = [...path, i];
				const child = node.children[i] as NormalizedNode;
				let childStatus = getNodeResult(uri, childPath);
				if (childStatus === "failure" && maybeRetry(uri, childPath, child)) {
					childStatus = null; // child reset — re-tick fresh
				}
				if (childStatus === "failure") return { type: "failure" };
				if (childStatus === "success") continue;
				const result = tickNode(uri, childPath, child);
				if (result.type === "done") {
					setNodeResult(uri, childPath, "success");
					continue;
				}
				if (result.type === "failure") {
					setNodeResult(uri, childPath, "failure");
					// Eagerly try the failed child's retries here. The lazy
					// check at the top of the loop only fires on a subsequent
					// tick, but in sequences/selectors/parallels we propagate
					// failure UP immediately — so without an eager check the
					// inner-composite retry budget never sees the failure.
					if (maybeRetry(uri, childPath, child)) {
						i--;
						continue;
					}
					return { type: "failure" };
				}
				return result;
			}
			return { type: "done" };
		}

		if (node.type === "selector") {
			for (let i = 0; i < node.children.length; i++) {
				const childPath = [...path, i];
				const child = node.children[i] as NormalizedNode;
				let childStatus = getNodeResult(uri, childPath);
				if (childStatus === "failure" && maybeRetry(uri, childPath, child)) {
					childStatus = null;
				}
				if (childStatus === "success") return { type: "done" };
				if (childStatus === "failure") continue;
				const result = tickNode(uri, childPath, child);
				if (result.type === "done") {
					setNodeResult(uri, childPath, "success");
					return { type: "done" };
				}
				if (result.type === "failure") {
					setNodeResult(uri, childPath, "failure");
					if (maybeRetry(uri, childPath, child)) {
						i--;
						continue;
					}
					continue;
				}
				return result;
			}
			return { type: "failure" };
		}

		if (node.type === "parallel") {
			let allDone = true;
			let firstPending: TickResult | null = null;
			for (let i = 0; i < node.children.length; i++) {
				const childPath = [...path, i];
				const child = node.children[i] as NormalizedNode;
				let childStatus = getNodeResult(uri, childPath);
				if (childStatus === "failure" && maybeRetry(uri, childPath, child)) {
					childStatus = null;
				}
				if (childStatus === "failure") return { type: "failure" };
				if (childStatus === "success") continue;
				const result = tickNode(uri, childPath, child);
				if (result.type === "done") {
					setNodeResult(uri, childPath, "success");
					continue;
				}
				if (result.type === "failure") {
					setNodeResult(uri, childPath, "failure");
					if (maybeRetry(uri, childPath, child)) {
						i--;
						continue;
					}
					return { type: "failure" };
				}
				allDone = false;
				if (!firstPending) firstPending = result;
			}
			if (allDone) return { type: "done" };
			return firstPending!;
		}

		return { type: "done" };
	}

	return {
		tickRoot,
		tickNode,
		getNodeResult,
		setNodeResult,
		getStepIndex,
		setStepIndex,
	};
}
