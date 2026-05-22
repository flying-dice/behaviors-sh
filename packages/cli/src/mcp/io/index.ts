// Factory that assembles the default URI-routing adapters for the CLI.
//
// Supported schemes (initial cut):
//   - tree:      file://
//   - execution: file://, memory://
//
// HTTP and S3 readers/writers are deferred to a follow-up — the
// routing tables make adding them a registration call, not a rewrite.

import {
	FileSystemExecutionReader,
	FileSystemExecutionWriter,
	FileSystemTreeReader,
} from '@behaviors-sh/runtime'
import { InMemoryExecutionStore } from './memory-execution.ts'
import { RoutingExecutionReader } from './routing-execution-reader.ts'
import { RoutingExecutionWriter } from './routing-execution-writer.ts'
import { RoutingTreeReader } from './routing-tree-reader.ts'

export interface DefaultIoAdapters {
	trees: RoutingTreeReader
	executionsRead: RoutingExecutionReader
	executionsWrite: RoutingExecutionWriter
	// Exposed so callers (tests, REPLs) can inspect the in-memory store
	// directly when they need to.
	memoryStore: InMemoryExecutionStore
}

export interface DefaultIoOptions {
	// Base directory for the FileSystemExecutionReader's `list()` scan.
	// Individual `file://` URIs may live anywhere on disk; this only
	// scopes the listing.
	executionsDir: string
	// cwd for the FileSystemTreeReader so bare/relative paths resolve
	// against a known root.
	cwd?: string
}

export function buildDefaultIoAdapters(
	opts: DefaultIoOptions,
): DefaultIoAdapters {
	const memoryStore = new InMemoryExecutionStore()
	const fsTreeReader = new FileSystemTreeReader({ cwd: opts.cwd })
	const fsExecutionReader = new FileSystemExecutionReader({
		executionsDir: opts.executionsDir,
	})
	const fsExecutionWriter = new FileSystemExecutionWriter()

	const trees = new RoutingTreeReader().register('file', fsTreeReader)
	const executionsRead = new RoutingExecutionReader()
		.register('file', fsExecutionReader)
		.register('memory', memoryStore)
	const executionsWrite = new RoutingExecutionWriter()
		.register('file', fsExecutionWriter)
		.register('memory', memoryStore)

	return { trees, executionsRead, executionsWrite, memoryStore }
}

export { InMemoryExecutionStore } from './memory-execution.ts'
export { RoutingExecutionReader } from './routing-execution-reader.ts'
export { RoutingExecutionWriter } from './routing-execution-writer.ts'
export { RoutingTreeReader } from './routing-tree-reader.ts'
export { uriScheme } from './scheme.ts'
