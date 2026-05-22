// Barrel: the public surface of the behaviors-sh runtime engine.
//
// The runtime is structured as a hexagonal (ports & adapters) package
// with dependency injection at every layer. The execution ports are
// split along read/write boundaries so at scale they can use different
// consistency models:
//   - `ports/`    — interfaces describing what the domain needs from
//                   the outside world (TreeReader, ExecutionReader,
//                   ExecutionWriter).
//   - `adapters/` — concrete implementations of those ports
//                   (FileSystemTreeReader, FileSystemExecutionReader,
//                   FileSystemExecutionWriter).
//   - factories   — `createExecutionStore`, `createRuntimeStore`,
//                   `createTick` build domain services from their deps.
//   - `buildRuntime` — entrypoint; takes adapter instances and returns a
//                   fully-wired `Runtime` ready to drive executions.
//
// There are no module-level singletons. To use the runtime in tests or
// against a different backend, construct your own adapters and call
// `buildRuntime(deps)`.

// --- entrypoint ---
export {
	type Runtime,
	type RuntimeDeps,
	buildRuntime,
} from "./runtime.ts";

// --- ports ---
export type { ExecutionReader } from "./ports/execution-reader.ts";
export type { ExecutionWriter } from "./ports/execution-writer.ts";
export type { LoadedTree, TreeReader } from "./ports/tree-reader.ts";

// --- adapters ---
export {
	FileSystemExecutionReader,
	type FileSystemExecutionReaderOptions,
} from "./adapters/fs-execution-reader.ts";
export { FileSystemExecutionWriter } from "./adapters/fs-execution-writer.ts";
export {
	defaultBehaviorsUiDir,
	defaultExecutionsDir,
	ensureDir,
} from "./adapters/fs-paths.ts";
export {
	FileSystemTreeReader,
	type FileSystemTreeReaderOptions,
} from "./adapters/fs-tree-reader.ts";

// --- domain service factories + their interfaces ---
export {
	type ExecutionSeed,
	type ExecutionStore,
	type ExecutionStoreDeps,
	createExecutionStore,
} from "./execution-store.ts";
export type { MutationListener } from "./internal/doc-accessor.ts";
export {
	type RuntimeStore,
	type RuntimeStoreDeps,
	createRuntimeStore,
} from "./runtime-store.ts";
export { type Tick, createTick } from "./tree.ts";

// --- pure helpers / types ---
export * from "./cursor.ts";
export { getNodeAtPath, getPathForNode } from "./node-path.ts";
export { sanitiseSlug } from "./tree-arg.ts";
export { EXECUTION_SCHEMA_VERSION } from "./types.ts";
export type {
	ActionNode,
	BehaviourNode,
	CompositeNode,
	ExecutionDocument,
	ExecutionPhase,
	ExecutionStatus,
	NodeState,
	NodeStatus,
	NormalizedActionNode,
	NormalizedCompositeNode,
	NormalizedNode,
	NormalizedRefNode,
	NormalizedStep,
	ParsedTree,
	RefNode,
	RuntimeState,
	Step,
	TickResult,
	TraceEntry,
	TraceKind,
} from "./types.ts";
export { die, out } from "./utils.ts";
export {
	AbtNodeSchema,
	BehaviourNodeSchema,
	normalizeNode,
	normalizeStep,
	validateRootNode,
} from "./validate.ts";
