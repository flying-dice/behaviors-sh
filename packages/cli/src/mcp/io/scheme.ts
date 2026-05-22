// Pure helper: extract the scheme portion of a URI ("file", "memory",
// "https", "s3", …). Returns null for inputs that don't look like a
// URI so callers can fall back to a default.

const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/

export function uriScheme(uri: string): string | null {
	const match = SCHEME_RE.exec(uri)
	return match ? (match[1] ?? '').toLowerCase() : null
}
