// Scheme-routing ExecutionReader: dispatches read operations to a
// per-scheme reader. `list()` returns the merged, chronologically
// sorted list across every registered scheme so callers see one flat
// universe of executions regardless of where each one lives.

import type {
	ExecutionDocument,
	ExecutionReader,
} from '@behaviors-ui/runtime'
import { uriScheme } from './scheme.ts'

export class RoutingExecutionReader implements ExecutionReader {
	private readonly readers = new Map<string, ExecutionReader>()

	register(scheme: string, reader: ExecutionReader): this {
		this.readers.set(scheme.toLowerCase(), reader)
		return this
	}

	findByUri(uri: string): ExecutionDocument | null {
		const scheme = uriScheme(uri)
		if (!scheme) return null
		const reader = this.readers.get(scheme)
		if (!reader) return null
		return reader.findByUri(uri)
	}

	list(): ExecutionDocument[] {
		const all: ExecutionDocument[] = []
		for (const reader of this.readers.values()) {
			for (const doc of reader.list()) all.push(doc)
		}
		all.sort((a, b) => a.created_at.localeCompare(b.created_at))
		return all
	}
}
