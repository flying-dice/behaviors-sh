// Internal-only state used by the tick engine. Not exposed via `$VAR`
// reads/writes — these maps live in `doc.runtime` and only tree.ts is
// meant to call them. Keys are dot-joined paths (e.g. "0.1.2") used as
// flat dictionary keys, not walked.

import { emptyRuntime } from "./execution-store.ts";
import type { DocAccessor } from "./internal/doc-accessor.ts";
import type { ExecutionDocument, NodeStatus } from "./types.ts";

export interface RuntimeStore {
	getStatus(uri: string, path: number[]): NodeStatus | null;
	setStatus(uri: string, path: number[], status: NodeStatus): void;
	getStep(uri: string, path: number[]): number;
	setStep(uri: string, path: number[], step: number): void;
	getRetryCount(uri: string, path: number[]): number;
	incrementRetryCount(uri: string, path: number[]): number;
	// Wipe all runtime keys whose path begins with `prefix`. Used when a
	// node retries: its node_status / step_index for itself and every
	// descendant must be cleared so the next tick re-attempts from a
	// clean slate. User-written $VAR data is untouched — the next attempt
	// sees the previous attempt's outputs, which is the whole point of
	// feedback.
	resetSubtree(uri: string, prefix: number[]): void;
	reset(uri: string): void;
}

export interface RuntimeStoreDeps {
	accessor: DocAccessor;
}

export function createRuntimeStore(deps: RuntimeStoreDeps): RuntimeStore {
	const { accessor } = deps;

	function mutateRuntime(
		uri: string,
		fn: (doc: ExecutionDocument) => void,
	): void {
		const doc = accessor.read(uri);
		if (!doc) throw new Error(`Execution not found: ${uri}`);
		fn(doc);
		doc.updated_at = new Date().toISOString();
		accessor.update(doc);
	}

	return {
		getStatus(uri, path) {
			const doc = accessor.read(uri);
			if (!doc) return null;
			return doc.runtime.node_status[path.join(".")] ?? null;
		},

		setStatus(uri, path, status) {
			mutateRuntime(uri, (doc) => {
				doc.runtime.node_status[path.join(".")] = status;
			});
		},

		getStep(uri, path) {
			const doc = accessor.read(uri);
			if (!doc) return 0;
			return doc.runtime.step_index[path.join(".")] ?? 0;
		},

		setStep(uri, path, step) {
			mutateRuntime(uri, (doc) => {
				doc.runtime.step_index[path.join(".")] = step;
			});
		},

		getRetryCount(uri, path) {
			const doc = accessor.read(uri);
			if (!doc) return 0;
			return doc.runtime.retry_count[path.join(".")] ?? 0;
		},

		incrementRetryCount(uri, path) {
			let next = 0;
			mutateRuntime(uri, (doc) => {
				const key = path.join(".");
				next = (doc.runtime.retry_count[key] ?? 0) + 1;
				doc.runtime.retry_count[key] = next;
			});
			return next;
		},

		resetSubtree(uri, prefix) {
			mutateRuntime(uri, (doc) => {
				const prefixKey = prefix.join(".");
				const matches = (k: string) =>
					prefixKey === ""
						? true
						: k === prefixKey || k.startsWith(`${prefixKey}.`);
				for (const map of [
					doc.runtime.node_status,
					doc.runtime.step_index,
				] as Record<string, unknown>[]) {
					for (const k of Object.keys(map)) {
						if (matches(k)) delete map[k];
					}
				}
			});
		},

		reset(uri) {
			mutateRuntime(uri, (doc) => {
				doc.runtime = emptyRuntime();
			});
		},
	};
}
