// Entrypoint: `buildRuntime` wires the three ports (TreeReader,
// ExecutionReader, ExecutionWriter) to caller-supplied adapters and
// returns a fully-constructed `Runtime`.
//
// All state lives on the returned instance. There are no module-level
// singletons; constructing a second runtime against different adapters
// (or in a test) is a single call away. Reader/writer are separate so
// at scale they can use different consistency models.

import {
	type ExecutionStore,
	createExecutionStore,
} from "./execution-store.ts";
import {
	createDocAccessor,
	type MutationListener,
} from "./internal/doc-accessor.ts";
import type { ExecutionReader } from "./ports/execution-reader.ts";
import type { ExecutionWriter } from "./ports/execution-writer.ts";
import type { LoadedTree, TreeReader } from "./ports/tree-reader.ts";
import {
	type RuntimeStore,
	createRuntimeStore,
} from "./runtime-store.ts";
import { type Tick, createTick } from "./tree.ts";

export interface RuntimeDeps {
	trees: TreeReader;
	executionsRead: ExecutionReader;
	executionsWrite: ExecutionWriter;
	// Fired after every successful write. Used by hosts (e.g. an HTTP
	// layer) that want to push live updates on execution changes.
	onMutation?: MutationListener;
}

export interface Runtime {
	executionStore: ExecutionStore;
	runtimeStore: RuntimeStore;
	tick: Tick;
	loadTree(uri: string): Promise<LoadedTree | null>;
}

export function buildRuntime(deps: RuntimeDeps): Runtime {
	const accessor = createDocAccessor({
		reader: deps.executionsRead,
		writer: deps.executionsWrite,
		onMutation: deps.onMutation,
	});
	const executionStore = createExecutionStore({
		reader: deps.executionsRead,
		accessor,
	});
	const runtimeStore = createRuntimeStore({ accessor });
	const tick = createTick(runtimeStore);
	return {
		executionStore,
		runtimeStore,
		tick,
		loadTree: (uri) => deps.trees.read(uri),
	};
}
