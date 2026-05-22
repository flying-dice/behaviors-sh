// Port: resolve a tree URI to a parsed, dereferenced, validated,
// normalized tree.
//
// `uri` is whatever the caller passes to `start_execution`. The
// scheme selects the reader implementation (file://, http(s)://, s3://
// in the CLI's routing reader). The port returns a fully-parsed tree
// or `null` if the URI can't be resolved.

import type { ParsedTree } from "../types.ts";

export interface LoadedTree {
	uri: string;
	slug: string;
	parsed: ParsedTree;
}

export interface TreeReader {
	read(uri: string): Promise<LoadedTree | null>;
}
