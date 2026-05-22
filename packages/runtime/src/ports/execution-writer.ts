// Port: write-only access to execution documents.
//
// `create` is the only path that introduces a new document and must
// fail if `doc.uri` already exists. `update` replaces an existing
// document atomically. `appendTrace` is the high-frequency tick path —
// implementations can stream/append a single trace entry without
// rewriting the whole document. `delete` removes by URI.

import type { ExecutionDocument, TraceEntry } from "../types.ts";

export interface ExecutionWriter {
	create(doc: ExecutionDocument): void;
	update(doc: ExecutionDocument): void;
	appendTrace(uri: string, entry: TraceEntry): void;
	delete(uri: string): void;
}
