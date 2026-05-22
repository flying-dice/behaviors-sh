// End-to-end smoke tests for the tick engine: create an execution from
// a tree, drive it through `runtime.tick.tickRoot` + RuntimeStore
// mutations, and verify the engine reaches `done` / `failure` at the
// right points.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildRuntime,
	FileSystemExecutionReader,
	FileSystemExecutionWriter,
	FileSystemTreeReader,
	INITIAL_CURSOR,
	type NormalizedNode,
	normalizeNode,
	type Runtime,
} from "../src/index.ts";

// Each test runs in its own temp dir and gets its own runtime so files
// don't pollute the workspace tree and adapter instances don't leak.
let tmp: string;
let executionsDir: string;
let runtime: Runtime;

beforeEach(() => {
	tmp = realpathSync(mkdtempSync(join(tmpdir(), "behaviors-sh-runtime-")));
	executionsDir = join(tmp, "executions");
	mkdirSync(executionsDir);
	runtime = buildRuntime({
		trees: new FileSystemTreeReader({ cwd: tmp }),
		executionsRead: new FileSystemExecutionReader({ executionsDir }),
		executionsWrite: new FileSystemExecutionWriter(),
	});
});

afterEach(() => {
	rmSync(tmp, { recursive: true, force: true });
});

let counter = 0;
function executionUri(): string {
	counter++;
	return pathToFileURL(join(executionsDir, `scenario-${counter}.json`)).href;
}

function createExecution(definition: NormalizedNode): string {
	const uri = executionUri();
	const now = new Date().toISOString();
	runtime.executionStore.create({
		uri,
		tree_uri: "memory://test-tree",
		tree: definition,
		status: "running",
		cursor: INITIAL_CURSOR,
		phase: "evaluating",
		protocol_accepted: true,
		created_at: now,
		updated_at: now,
	});
	return uri;
}

describe("tickRoot — sequence", () => {
	test("walks every child in order and reaches done", () => {
		const root = normalizeNode({
			type: "sequence",
			name: "Root",
			children: [
				{ type: "action", name: "A", steps: [{ instruct: "a" }] },
				{ type: "action", name: "B", steps: [{ instruct: "b" }] },
			],
		}) as NormalizedNode;

		const uri = createExecution(root);

		let t = runtime.tick.tickRoot(uri, root);
		expect(t).toMatchObject({ type: "instruct", name: "A" });
		runtime.runtimeStore.setStatus(uri, [0], "success");

		t = runtime.tick.tickRoot(uri, root);
		expect(t).toMatchObject({ type: "instruct", name: "B" });
		runtime.runtimeStore.setStatus(uri, [1], "success");

		t = runtime.tick.tickRoot(uri, root);
		expect(t).toEqual({ type: "done" });
	});

	test("propagates failure and does not advance to later children", () => {
		const root = normalizeNode({
			type: "sequence",
			name: "Root",
			children: [
				{ type: "action", name: "A", steps: [{ instruct: "a" }] },
				{ type: "action", name: "B", steps: [{ instruct: "b" }] },
			],
		}) as NormalizedNode;

		const uri = createExecution(root);

		runtime.tick.tickRoot(uri, root); // emit A
		runtime.runtimeStore.setStatus(uri, [0], "failure");

		expect(runtime.tick.tickRoot(uri, root)).toEqual({ type: "failure" });
	});
});

describe("tickRoot — selector", () => {
	test("succeeds on first child success without running the rest", () => {
		const root = normalizeNode({
			type: "selector",
			name: "Root",
			children: [
				{ type: "action", name: "A", steps: [{ instruct: "a" }] },
				{ type: "action", name: "B", steps: [{ instruct: "b" }] },
			],
		}) as NormalizedNode;

		const uri = createExecution(root);

		runtime.tick.tickRoot(uri, root);
		runtime.runtimeStore.setStatus(uri, [0], "success");

		expect(runtime.tick.tickRoot(uri, root)).toEqual({ type: "done" });
	});

	test("falls through failures and fails when every child fails", () => {
		const root = normalizeNode({
			type: "selector",
			name: "Root",
			children: [
				{ type: "action", name: "A", steps: [{ instruct: "a" }] },
				{ type: "action", name: "B", steps: [{ instruct: "b" }] },
			],
		}) as NormalizedNode;

		const uri = createExecution(root);

		runtime.tick.tickRoot(uri, root);
		runtime.runtimeStore.setStatus(uri, [0], "failure");

		const second = runtime.tick.tickRoot(uri, root);
		expect(second).toMatchObject({ type: "instruct", name: "B" });
		runtime.runtimeStore.setStatus(uri, [1], "failure");

		expect(runtime.tick.tickRoot(uri, root)).toEqual({ type: "failure" });
	});
});

describe("tickRoot — action with retries", () => {
	test("retries an action on failure when its budget allows", () => {
		const root = normalizeNode({
			type: "action",
			name: "Flaky",
			retries: 2,
			steps: [{ instruct: "try" }],
		}) as NormalizedNode;

		const uri = createExecution(root);

		const first = runtime.tick.tickRoot(uri, root);
		expect(first).toMatchObject({ type: "instruct", name: "Flaky" });
		runtime.runtimeStore.setStatus(uri, [], "failure");

		const second = runtime.tick.tickRoot(uri, root);
		expect(second).toMatchObject({ type: "instruct", name: "Flaky" });
		expect(runtime.runtimeStore.getRetryCount(uri, [])).toBe(1);
	});

	test("propagates failure once the retry budget is exhausted", () => {
		const root = normalizeNode({
			type: "action",
			name: "Flaky",
			retries: 1,
			steps: [{ instruct: "try" }],
		}) as NormalizedNode;

		const uri = createExecution(root);

		runtime.tick.tickRoot(uri, root);
		runtime.runtimeStore.setStatus(uri, [], "failure");
		runtime.tick.tickRoot(uri, root); // consumes the single retry
		runtime.runtimeStore.setStatus(uri, [], "failure");

		expect(runtime.tick.tickRoot(uri, root)).toEqual({ type: "failure" });
	});
});
