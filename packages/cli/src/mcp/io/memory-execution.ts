// In-memory adapter that implements both ExecutionReader and
// ExecutionWriter for the `memory://` URI scheme. Process-lifetime
// only — two URIs that share the same caller-supplied id share state.
// Useful for tests, REPL-style runs, and any client that doesn't need
// resumability across process boundaries.

import type {
	ExecutionDocument,
	ExecutionReader,
	ExecutionWriter,
	TraceEntry,
} from '@behaviors-ui/runtime'

export class InMemoryExecutionStore implements ExecutionReader, ExecutionWriter {
	private readonly docs = new Map<string, ExecutionDocument>()

	findByUri(uri: string): ExecutionDocument | null {
		return this.docs.get(uri) ?? null
	}

	list(): ExecutionDocument[] {
		return [...this.docs.values()].sort((a, b) =>
			a.created_at.localeCompare(b.created_at),
		)
	}

	create(doc: ExecutionDocument): void {
		if (this.docs.has(doc.uri)) {
			throw new Error(`Execution already exists: ${doc.uri}`)
		}
		this.docs.set(doc.uri, structuredClone(doc))
	}

	update(doc: ExecutionDocument): void {
		this.docs.set(doc.uri, structuredClone(doc))
	}

	appendTrace(uri: string, entry: TraceEntry): void {
		const doc = this.docs.get(uri)
		if (!doc) throw new Error(`Execution not found: ${uri}`)
		doc.trace.push(structuredClone(entry))
		doc.updated_at = new Date().toISOString()
	}

	delete(uri: string): void {
		this.docs.delete(uri)
	}
}
