// Internal helper shared by the ExecutionStore and RuntimeStore
// factories. Wraps the ExecutionReader + ExecutionWriter ports with the
// `onMutation` notification so both stores fire the listener on writes
// without each holding its own copy of the wiring.

import type { ExecutionReader } from "../ports/execution-reader.ts";
import type { ExecutionWriter } from "../ports/execution-writer.ts";
import type { ExecutionDocument, TraceEntry } from "../types.ts";

export type MutationListener = (uri: string) => void;

export interface DocAccessor {
	read(uri: string): ExecutionDocument | null;
	create(doc: ExecutionDocument): void;
	update(doc: ExecutionDocument): void;
	appendTrace(uri: string, entry: TraceEntry): void;
	delete(uri: string): void;
}

export interface DocAccessorDeps {
	reader: ExecutionReader;
	writer: ExecutionWriter;
	onMutation?: MutationListener;
}

export function createDocAccessor(deps: DocAccessorDeps): DocAccessor {
	const { reader, writer, onMutation } = deps;
	const notify = (uri: string) => {
		if (onMutation) onMutation(uri);
	};
	return {
		read(uri) {
			return reader.findByUri(uri);
		},
		create(doc) {
			writer.create(doc);
			notify(doc.uri);
		},
		update(doc) {
			writer.update(doc);
			notify(doc.uri);
		},
		appendTrace(uri, entry) {
			writer.appendTrace(uri, entry);
			notify(uri);
		},
		delete(uri) {
			writer.delete(uri);
			notify(uri);
		},
	};
}
