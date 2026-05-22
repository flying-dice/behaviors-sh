// Internal `$ref` pointers always look like `#/components/trees/<id>`.
// The UI hides this JSON-pointer plumbing and presents refs as "tree
// links" — so we centralise the parsing and formatting here.

const PREFIX = "#/components/trees/";

export function refToTreeId(ref: string): string | null {
	if (!ref.startsWith(PREFIX)) return null;
	const id = ref.slice(PREFIX.length);
	return id.length ? id : null;
}

export function treeIdToRef(id: string): string {
	return `${PREFIX}${id}`;
}
