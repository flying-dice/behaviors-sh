// Pure input-string helpers. The FS-specific URI handling lives in
// `adapters/fs-tree-reader.ts`; `sanitiseSlug` is pure and stays here
// so adapters (and tests) can use it without pulling in the FS adapter.

// Slugs are used as the human-readable identifier for a loaded tree
// (e.g. surfaced in UI lists). Any character outside `[a-z0-9_-]`
// becomes a hyphen, and the result is trimmed of leading/trailing
// hyphens so an `@scope/name` package collapses cleanly to `scope-name`.
export function sanitiseSlug(raw: string): string {
	const cleaned = raw
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return cleaned.length > 0 ? cleaned : "tree";
}
