// End-to-end smoke test for the MCP-facing runtime wiring.
//
// Builds the URI-routing adapters + runtime exactly the way the STDIO
// entrypoint does, then drives a tree through the same primitive
// operations the MCP tools call. Verifies cross-scheme behaviour: a
// `memory://` execution and a `file://` execution share one runtime
// without colliding, and the `memory://` store keeps trace appends in
// memory only.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildRuntime,
	INITIAL_CURSOR,
	type Runtime,
} from "@behaviors-sh/runtime";
import { buildDefaultIoAdapters } from "../src/mcp/io/index.ts";

let tmp: string;
let executionsDir: string;
let treeUri: string;
let runtime: Runtime;

beforeEach(() => {
	tmp = realpathSync(mkdtempSync(join(tmpdir(), "behaviors-sh-cli-mcp-")));
	executionsDir = join(tmp, "executions");
	mkdirSync(executionsDir);

	const treePath = join(tmp, "tree.json");
	writeFileSync(
		treePath,
		JSON.stringify({
			type: "sequence",
			name: "Root",
			children: [
				{ type: "action", name: "A", steps: [{ instruct: "do a" }] },
				{ type: "action", name: "B", steps: [{ instruct: "do b" }] },
			],
		}),
	);
	treeUri = pathToFileURL(treePath).href;

	const { trees, executionsRead, executionsWrite } = buildDefaultIoAdapters({
		executionsDir,
		cwd: tmp,
	});
	runtime = buildRuntime({ trees, executionsRead, executionsWrite });
});

afterEach(() => {
	rmSync(tmp, { recursive: true, force: true });
});

async function start(uri: string): Promise<void> {
	const loaded = await runtime.loadTree(treeUri);
	if (!loaded) throw new Error("tree did not load");
	const now = new Date().toISOString();
	runtime.executionStore.create({
		uri,
		tree_uri: treeUri,
		tree: loaded.parsed,
		status: "running",
		phase: "evaluating",
		cursor: INITIAL_CURSOR,
		protocol_accepted: true,
		created_at: now,
		updated_at: now,
	});
}

describe("memory:// execution scheme", () => {
	test("drives a tree to done and keeps the doc out of the filesystem", async () => {
		const uri = "memory://run-1";
		await start(uri);

		// First tick → instruct A
		const tickA = runtime.tick.tickRoot(
			uri,
			runtime.executionStore.findByUri(uri)!.tree,
		);
		expect(tickA).toMatchObject({ type: "instruct", name: "A" });

		runtime.executionStore.appendTrace(uri, {
			ts: new Date().toISOString(),
			kind: "instruct",
			cursor: "0",
			name: "A",
			submitted: "done a",
			outcome: "success",
		});
		runtime.runtimeStore.setStatus(uri, [0], "success");

		// Second tick → instruct B
		const tickB = runtime.tick.tickRoot(
			uri,
			runtime.executionStore.findByUri(uri)!.tree,
		);
		expect(tickB).toMatchObject({ type: "instruct", name: "B" });
		runtime.runtimeStore.setStatus(uri, [1], "success");

		// Third tick → done
		expect(
			runtime.tick.tickRoot(uri, runtime.executionStore.findByUri(uri)!.tree),
		).toEqual({ type: "done" });

		const doc = runtime.executionStore.findByUri(uri);
		expect(doc).not.toBeNull();
		expect(doc!.trace.length).toBe(1);
		expect(doc!.uri).toBe(uri);

		// Confirm the doc is not on disk
		expect(() =>
			readFileSync(join(executionsDir, "run-1.json"), "utf-8"),
		).toThrow();
	});

	test("start_execution on an existing memory:// uri errors", async () => {
		await start("memory://dup");
		await expect(start("memory://dup")).rejects.toThrow(/already exists/);
	});
});

describe("file:// execution scheme", () => {
	test("persists the doc and a trace append to disk atomically", async () => {
		const filePath = join(executionsDir, "run-disk.json");
		const uri = pathToFileURL(filePath).href;
		await start(uri);

		runtime.executionStore.appendTrace(uri, {
			ts: new Date().toISOString(),
			kind: "instruct",
			cursor: "0",
			name: "A",
			submitted: "done a",
			outcome: "success",
		});

		const raw = JSON.parse(readFileSync(filePath, "utf-8"));
		expect(raw.uri).toBe(uri);
		expect(raw.tree_uri).toBe(treeUri);
		expect(raw.schema_version).toBe(1);
		expect(raw.trace.length).toBe(1);
		expect(raw.trace[0].submitted).toBe("done a");
	});
});

describe("mixed schemes share one runtime", () => {
	test("a memory:// run and a file:// run do not collide", async () => {
		const memUri = "memory://mixed-1";
		const fileUri = pathToFileURL(join(executionsDir, "mixed-1.json")).href;

		await start(memUri);
		await start(fileUri);

		runtime.runtimeStore.setStatus(memUri, [0], "success");
		runtime.runtimeStore.setStatus(fileUri, [0], "failure");

		const memDoc = runtime.executionStore.findByUri(memUri);
		const fileDoc = runtime.executionStore.findByUri(fileUri);

		expect(memDoc!.runtime.node_status["0"]).toBe("success");
		expect(fileDoc!.runtime.node_status["0"]).toBe("failure");
	});
});

describe("unknown scheme", () => {
	test("start rejects an execution URI whose scheme is not registered", async () => {
		await expect(start("s3://bucket/key.json")).rejects.toThrow(
			/No writer registered/,
		);
	});

	test("loadTree returns null for an unsupported tree URI scheme", async () => {
		expect(await runtime.loadTree("https://example.com/tree.json")).toBeNull();
	});
});
