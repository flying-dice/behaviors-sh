// Decoders for the trace-entry `cursor` field. Each entry stores
// either `"null"` (protocol gate / no-action-in-flight) or the runtime
// cursor as JSON-stringified `{path, step}`. We expose the decoded path
// (used to bucket trace entries by node) and a small helper for the
// in-flight cursor on the doc itself.

import type { ExecutionDocument, ParsedTree } from "@behaviors-sh/spec";

export interface DecodedCursor {
	path: number[];
	step: number;
}

export function decodeCursor(encoded: string): DecodedCursor | null {
	if (!encoded || encoded === "null") return null;
	try {
		const parsed = JSON.parse(encoded) as unknown;
		if (parsed === null || Array.isArray(parsed)) return null;
		const candidate = parsed as Partial<DecodedCursor>;
		if (!Array.isArray(candidate.path) || typeof candidate.step !== "number") {
			return null;
		}
		return { path: candidate.path, step: candidate.step };
	} catch {
		return null;
	}
}

// Path keys used to align with `behaviour-layout.ts`'s `pathKey`
// (which returns `"root"` for the empty path). The runtime stores
// `node_status` under `path.join('.')` — empty-path root is `""`.
// These helpers translate between the two so the canvas overlay can
// look up status without leaking format details into components.
export function statusKeyForPath(path: number[]): string {
	return path.join(".");
}

export function canvasKeyForPath(path: number[]): string {
	return path.join(".") || "root";
}

export function inFlightPath(doc: ExecutionDocument): number[] | null {
	if (doc.phase !== "evaluating" && doc.phase !== "performing") return null;
	const c = decodeCursor(doc.cursor);
	return c?.path ?? null;
}

// The original instruction / evaluate expression for a trace entry's
// cursor. Walks the embedded (normalised) tree to find the action's
// step at `cursor.path` / `cursor.step` and returns its source text.
// Returns null for entries with no cursor (protocol gate), for cursors
// that point at composites/refs, or when the step index is out of
// range (e.g. think entries logged after the action advanced past).
export function promptForCursor(
	tree: ParsedTree,
	encoded: string,
): { kind: "evaluate" | "instruct"; text: string } | null {
	const c = decodeCursor(encoded);
	if (!c) return null;
	let node: ParsedTree = tree;
	for (const i of c.path) {
		if (node.type === "ref" || node.type === "action") return null;
		const child = node.children[i];
		if (!child) return null;
		node = child;
	}
	if (node.type !== "action") return null;
	const step = node.steps[c.step];
	if (!step) return null;
	if (step.kind === "evaluate")
		return { kind: "evaluate", text: step.expression };
	return { kind: "instruct", text: step.instruction };
}
