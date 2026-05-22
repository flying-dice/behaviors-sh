// Domain service over the ExecutionReader + ExecutionWriter ports.
//
// `createExecutionStore` returns the high-level CRUD/append/scope API
// the rest of the runtime depends on. Documents are addressed by URI;
// the system never mints identifiers — callers supply them via the
// URI passed to `start_execution`.

import type { DocAccessor } from "./internal/doc-accessor.ts";
import type { ExecutionReader } from "./ports/execution-reader.ts";
import {
	EXECUTION_SCHEMA_VERSION,
	type ExecutionDocument,
	type RuntimeState,
	type TraceEntry,
} from "./types.ts";

function emptyRuntime(): RuntimeState {
	return { node_status: {}, step_index: {}, retry_count: {} };
}

function walkPath(obj: Record<string, unknown>, path: string): unknown {
	if (!path) throw new Error("Path required");
	const segs = path.split(".");
	// biome-ignore lint/suspicious/noExplicitAny: dot-notation walker; cur is intentionally untyped.
	let cur: any = obj;
	for (const seg of segs) {
		if (cur === null || typeof cur !== "object") return null;
		cur = cur[seg];
	}
	return cur ?? null;
}

function setPath(
	obj: Record<string, unknown>,
	path: string,
	value: unknown,
): void {
	if (!path) throw new Error("Path required");
	const segs = path.split(".");
	// biome-ignore lint/suspicious/noExplicitAny: dot-notation walker; cur is intentionally untyped.
	let cur: any = obj;
	for (let i = 0; i < segs.length - 1; i++) {
		const seg = segs[i]!;
		if (cur[seg] === null || typeof cur[seg] !== "object") cur[seg] = {};
		cur = cur[seg];
	}
	cur[segs[segs.length - 1]!] = value;
}

// What the caller hands to `create`: a document seed. The store fills
// in the scopes (`var`, `const`) from `tree.state` and zeroes the
// runtime bookkeeping + trace.
export type ExecutionSeed = Omit<
	ExecutionDocument,
	"schema_version" | "var" | "const" | "runtime" | "trace"
>;

export interface ExecutionStore {
	findByUri(uri: string): ExecutionDocument | null;
	list(): ExecutionDocument[];
	create(seed: ExecutionSeed): ExecutionDocument;
	update(
		uri: string,
		fields: Partial<
			Pick<
				ExecutionDocument,
				"status" | "cursor" | "phase" | "protocol_accepted" | "trace"
			>
		>,
	): void;
	appendTrace(uri: string, entry: TraceEntry): void;
	delete(uri: string): void;
	getScope(uri: string, scope: "var" | "const", path?: string): unknown;
	setScope(
		uri: string,
		scope: "var" | "const",
		path: string,
		value: unknown,
	): void;
	replaceScope(
		uri: string,
		scope: "var" | "const",
		data: Record<string, unknown>,
	): void;
}

export interface ExecutionStoreDeps {
	reader: ExecutionReader;
	accessor: DocAccessor;
}

export function createExecutionStore(deps: ExecutionStoreDeps): ExecutionStore {
	const { reader, accessor } = deps;

	function mutateScope(
		uri: string,
		scope: "var" | "const",
		fn: (s: Record<string, unknown>) => void,
	): void {
		const doc = accessor.read(uri);
		if (!doc) throw new Error(`Execution not found: ${uri}`);
		fn(doc[scope]);
		doc.updated_at = new Date().toISOString();
		accessor.update(doc);
	}

	return {
		findByUri(uri) {
			return accessor.read(uri);
		},

		list() {
			return reader.list();
		},

		create(seed) {
			// Live scopes start as a copy of the frozen `tree.state.var` /
			// `tree.state.const`. `$VAR` is mutated by agent writes during
			// the run; `$CONST` is never written after create. `state` only
			// matters on the root; on inner nodes the schema permits it but
			// the runtime ignores it.
			const rootState = seed.tree.type !== "ref" ? (seed.tree.state ?? {}) : {};
			const doc: ExecutionDocument = {
				...seed,
				schema_version: EXECUTION_SCHEMA_VERSION,
				var: { ...(rootState.var ?? {}) },
				const: { ...(rootState.const ?? {}) },
				runtime: emptyRuntime(),
				trace: [],
			};
			accessor.create(doc);
			return doc;
		},

		update(uri, fields) {
			const doc = accessor.read(uri);
			if (!doc) throw new Error(`Execution not found: ${uri}`);
			if (fields.status !== undefined) doc.status = fields.status;
			if (fields.cursor !== undefined) doc.cursor = fields.cursor;
			if (fields.phase !== undefined) doc.phase = fields.phase;
			if (fields.protocol_accepted !== undefined)
				doc.protocol_accepted = fields.protocol_accepted;
			if (fields.trace !== undefined) doc.trace = fields.trace;
			doc.updated_at = new Date().toISOString();
			accessor.update(doc);
		},

		appendTrace(uri, entry) {
			accessor.appendTrace(uri, entry);
		},

		delete(uri) {
			accessor.delete(uri);
		},

		getScope(uri, scope, path) {
			const doc = accessor.read(uri);
			if (!doc) return null;
			return path ? walkPath(doc[scope], path) : doc[scope];
		},

		setScope(uri, scope, path, value) {
			mutateScope(uri, scope, (s) => setPath(s, path, value));
		},

		replaceScope(uri, scope, data) {
			mutateScope(uri, scope, (s) => {
				for (const k of Object.keys(s)) delete s[k];
				Object.assign(s, data);
			});
		},
	};
}

export { emptyRuntime };
