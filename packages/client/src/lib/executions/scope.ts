// Helpers for rendering execution scopes (`$VAR` / `$CONST`). Keys in
// the runtime are namespaced as `<DeclaringNode>__<slot>` by the DSL;
// we split that apart so the UI can show the slot as the primary
// identifier and the namespace as subordinate context.

export type ValueKind =
	| "null"
	| "boolean"
	| "number"
	| "string"
	| "array"
	| "object";

export function kindOf(value: unknown): ValueKind {
	if (value === null || value === undefined) return "null";
	if (typeof value === "boolean") return "boolean";
	if (typeof value === "number") return "number";
	if (typeof value === "string") return "string";
	if (Array.isArray(value)) return "array";
	return "object";
}

export interface SplitKey {
	namespace: string | null;
	local: string;
}

export function splitNamespacedKey(key: string): SplitKey {
	const idx = key.indexOf("__");
	if (idx === -1) return { namespace: null, local: key };
	return { namespace: key.slice(0, idx), local: key.slice(idx + 2) };
}

// Tokenise a free-text string for inline `$VAR.<key>` / `$CONST.<key>`
// references. Used by the Activity timeline to swap raw mangled paths
// out of instructions / submissions / notes and replace them with
// hoverable badges that show the live value.
//
// `<key>` may include letters, digits, underscores, and dots so nested
// paths (e.g. `$VAR.user.email`) survive untouched. The pattern
// explicitly disallows a trailing dot so sentence punctuation
// (`Wrote to $VAR.greeting.`) doesn't get swallowed into the key.

export type ScopeKind = "var" | "const";

export interface ScopeRef {
	scope: ScopeKind;
	key: string;
	raw: string;
}

export type Token =
	| { kind: "text"; text: string }
	| { kind: "ref"; ref: ScopeRef };

const REF_PATTERN =
	/\$(VAR|CONST)\.([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)/g;

export function tokenizeText(text: string): Token[] {
	if (!text) return [];
	const tokens: Token[] = [];
	let lastEnd = 0;
	for (const match of text.matchAll(REF_PATTERN)) {
		const start = match.index ?? 0;
		if (start > lastEnd) {
			tokens.push({ kind: "text", text: text.slice(lastEnd, start) });
		}
		const scope: ScopeKind = match[1] === "VAR" ? "var" : "const";
		tokens.push({
			kind: "ref",
			ref: { scope, key: match[2] ?? "", raw: match[0] },
		});
		lastEnd = start + match[0].length;
	}
	if (lastEnd < text.length) {
		tokens.push({ kind: "text", text: text.slice(lastEnd) });
	}
	return tokens;
}

// Resolve a single ref against an execution doc's scopes. Returns the
// stored value plus a hint about whether the slot exists at all
// (distinguishing "not set" from "no such key").
export function resolveRef(
	ref: ScopeRef,
	varScope: Record<string, unknown>,
	constScope: Record<string, unknown>,
): { exists: boolean; value: unknown } {
	const source = ref.scope === "var" ? varScope : constScope;
	// Walk dotted paths so `$VAR.user.email` resolves through nested
	// objects. The flat-key case (no dots) hits the first iteration.
	const segments = ref.key.split(".");
	let cur: unknown = source;
	for (const seg of segments) {
		if (cur === null || cur === undefined)
			return { exists: false, value: undefined };
		if (typeof cur !== "object") return { exists: false, value: undefined };
		const map = cur as Record<string, unknown>;
		if (!(seg in map)) return { exists: false, value: undefined };
		cur = map[seg];
	}
	return { exists: true, value: cur };
}
