// Adapter: filesystem implementation of the TreeReader port.
//
// Accepts `file://` URIs (or, for convenience, plain absolute / relative
// paths) and resolves them to a concrete YAML/JSON file. The file is
// dereferenced via `@apidevtools/json-schema-ref-parser`, then validated
// and normalised. `circular: "ignore"` leaves cyclic edges as literal
// `{ $ref: "..." }` objects so a cycle can't blow the stack at validate
// time; the runtime fails cleanly if it ever ticks the preserved ref.

import { existsSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import type { LoadedTree, TreeReader } from "../ports/tree-reader.ts";
import { sanitiseSlug } from "../tree-arg.ts";
import type { ParsedTree } from "../types.ts";
import { normalizeNode, validateRootNode } from "../validate.ts";

const TREE_FILE_RE = /\.(ya?ml|json)$/i;

export interface FileSystemTreeReaderOptions {
	cwd?: string;
}

export class FileSystemTreeReader implements TreeReader {
	private readonly cwd: string;

	constructor(opts: FileSystemTreeReaderOptions = {}) {
		this.cwd = opts.cwd ?? process.cwd();
	}

	async read(uri: string): Promise<LoadedTree | null> {
		const fsPath = this.resolveUri(uri);
		if (!fsPath) return null;
		const { parsed, slug } = await parseTreeAtPath(fsPath);
		return { uri, slug, parsed };
	}

	private resolveUri(uri: string): string | null {
		const abs = toAbsolutePath(uri, this.cwd);
		if (!abs) return null;
		if (!existsSync(abs)) return null;
		if (!statSync(abs).isFile()) return null;
		if (!TREE_FILE_RE.test(abs)) return null;
		return abs;
	}
}

// Accepts file:// URIs and bare paths (absolute or relative-to-cwd).
// Returns the resolved absolute path, or null if the URI scheme isn't
// understood.
function toAbsolutePath(uri: string, cwd: string): string | null {
	if (uri.startsWith("file://")) {
		try {
			return fileURLToPath(uri);
		} catch {
			return null;
		}
	}
	// Bare path — kept for ergonomics so internal callers don't have to
	// stringify file:// URIs for relative test fixtures. Production
	// callers should pass file:// URIs.
	if (uri.includes("://")) return null;
	return isAbsolute(uri) ? uri : resolve(cwd, uri);
}

async function parseTreeAtPath(
	yamlPath: string,
): Promise<{ parsed: ParsedTree; slug: string }> {
	const raw = await $RefParser.dereference(yamlPath, {
		dereference: { circular: "ignore" },
	});
	const node = validateRootNode(raw);
	if ("$ref" in node) {
		throw new Error("tree file root may not be a $ref node");
	}
	return {
		slug: sanitiseSlug(node.name),
		parsed: normalizeNode(node),
	};
}
