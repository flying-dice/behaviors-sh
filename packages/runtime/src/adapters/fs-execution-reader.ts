// Adapter: filesystem implementation of the ExecutionReader port.
//
// Reads `file://` URIs directly (the URI **is** the path), and lists
// all execution documents under a base `executionsDir`. The base dir
// only matters for `list()` — `findByUri` is purely URI-driven.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ExecutionReader } from "../ports/execution-reader.ts";
import type { ExecutionDocument } from "../types.ts";

export interface FileSystemExecutionReaderOptions {
	executionsDir: string;
}

export class FileSystemExecutionReader implements ExecutionReader {
	private readonly executionsDir: string;

	constructor(opts: FileSystemExecutionReaderOptions) {
		this.executionsDir = opts.executionsDir;
	}

	findByUri(uri: string): ExecutionDocument | null {
		const path = uriToPath(uri);
		if (!path) return null;
		if (!existsSync(path)) return null;
		try {
			return JSON.parse(readFileSync(path, "utf-8")) as ExecutionDocument;
		} catch (_e) {
			throw new Error(`Corrupt execution file: ${uri}`);
		}
	}

	list(): ExecutionDocument[] {
		if (!existsSync(this.executionsDir)) return [];
		if (!statSync(this.executionsDir).isDirectory()) return [];
		const docs: ExecutionDocument[] = [];
		for (const name of readdirSync(this.executionsDir)) {
			if (!name.endsWith(".json")) continue;
			const filePath = join(this.executionsDir, name);
			try {
				const parsed = JSON.parse(
					readFileSync(filePath, "utf-8"),
				) as ExecutionDocument;
				// Fall back to deriving uri from path if a doc on disk
				// lacks one (e.g. older format) so list() never silently
				// drops it.
				if (!parsed.uri) parsed.uri = pathToFileURL(filePath).href;
				docs.push(parsed);
			} catch {
				// skip corrupt files in list view
			}
		}
		docs.sort((a, b) => a.created_at.localeCompare(b.created_at));
		return docs;
	}
}

function uriToPath(uri: string): string | null {
	if (!uri.startsWith("file://")) return null;
	try {
		return fileURLToPath(uri);
	} catch {
		return null;
	}
}
