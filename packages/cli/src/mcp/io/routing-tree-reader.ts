// Scheme-routing TreeReader: dispatches `read(uri)` to a per-scheme
// reader. New schemes (http(s), s3, gs, …) are added by registering
// another reader against this router; the runtime never has to know
// what schemes are supported.

import type { LoadedTree, TreeReader } from '@behaviors-sh/runtime'
import { uriScheme } from './scheme.ts'

export class RoutingTreeReader implements TreeReader {
	private readonly readers = new Map<string, TreeReader>()

	register(scheme: string, reader: TreeReader): this {
		this.readers.set(scheme.toLowerCase(), reader)
		return this
	}

	async read(uri: string): Promise<LoadedTree | null> {
		const scheme = uriScheme(uri)
		if (!scheme) return null
		const reader = this.readers.get(scheme)
		if (!reader) return null
		return reader.read(uri)
	}
}
