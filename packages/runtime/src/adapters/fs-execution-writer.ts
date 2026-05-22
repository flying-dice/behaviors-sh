// Adapter: filesystem implementation of the ExecutionWriter port.
//
// `create` writes via a `.tmp` sibling + rename for atomicity and fails
// if the destination already exists (the caller must use `resume` if
// they want to continue an existing execution). `update` and
// `appendTrace` rewrite the whole document atomically; a true streaming
// append could be added later if trace size becomes a bottleneck.

import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionWriter } from "../ports/execution-writer.ts";
import type { ExecutionDocument, TraceEntry } from "../types.ts";

export class FileSystemExecutionWriter implements ExecutionWriter {
	create(doc: ExecutionDocument): void {
		const path = uriToPath(doc.uri);
		if (existsSync(path)) {
			throw new Error(`Execution already exists: ${doc.uri}`);
		}
		writeAtomic(path, JSON.stringify(doc, null, 2));
	}

	update(doc: ExecutionDocument): void {
		const path = uriToPath(doc.uri);
		writeAtomic(path, JSON.stringify(doc, null, 2));
	}

	appendTrace(uri: string, entry: TraceEntry): void {
		const path = uriToPath(uri);
		if (!existsSync(path)) {
			throw new Error(`Execution not found: ${uri}`);
		}
		const doc = JSON.parse(readFileSync(path, "utf-8")) as ExecutionDocument;
		doc.trace.push(entry);
		doc.updated_at = new Date().toISOString();
		writeAtomic(path, JSON.stringify(doc, null, 2));
	}

	delete(uri: string): void {
		const path = uriToPath(uri);
		if (existsSync(path)) unlinkSync(path);
	}
}

function uriToPath(uri: string): string {
	if (!uri.startsWith("file://")) {
		throw new Error(
			`FileSystemExecutionWriter only supports file:// URIs (got: ${uri})`,
		);
	}
	return fileURLToPath(uri);
}

function writeAtomic(path: string, contents: string): void {
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, contents);
	renameSync(tmp, path);
}
