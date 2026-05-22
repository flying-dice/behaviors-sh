// Scheme-routing ExecutionWriter: dispatches each write operation to a
// per-scheme writer. The writer is selected by the URI scheme of
// either `doc.uri` (create/update) or the bare `uri` argument
// (appendTrace/delete).

import type {
	ExecutionDocument,
	ExecutionWriter,
	TraceEntry,
} from '@behaviors-sh/runtime'
import { uriScheme } from './scheme.ts'

export class RoutingExecutionWriter implements ExecutionWriter {
	private readonly writers = new Map<string, ExecutionWriter>()

	register(scheme: string, writer: ExecutionWriter): this {
		this.writers.set(scheme.toLowerCase(), writer)
		return this
	}

	private resolve(uri: string): ExecutionWriter {
		const scheme = uriScheme(uri)
		if (!scheme) throw new Error(`URI has no scheme: ${uri}`)
		const writer = this.writers.get(scheme)
		if (!writer) {
			throw new Error(`No writer registered for scheme: ${scheme}://`)
		}
		return writer
	}

	create(doc: ExecutionDocument): void {
		this.resolve(doc.uri).create(doc)
	}

	update(doc: ExecutionDocument): void {
		this.resolve(doc.uri).update(doc)
	}

	appendTrace(uri: string, entry: TraceEntry): void {
		this.resolve(uri).appendTrace(uri, entry)
	}

	delete(uri: string): void {
		this.resolve(uri).delete(uri)
	}
}
