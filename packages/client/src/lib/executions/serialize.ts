// Parse an execution document from a file's text contents. Mirrors
// `parseWorkspace` / `parseTreeFile` in style — minimal duck-type
// validation, plain errors that the UI can surface.

import type { ExecutionDocument } from '@behaviors-ui/spec';

export class ParseExecutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ParseExecutionError';
	}
}

export function parseExecutionDoc(text: string): ExecutionDocument {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (err) {
		throw new ParseExecutionError(
			`File is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	if (!isRecord(raw)) {
		throw new ParseExecutionError('Execution document must be a JSON object.');
	}

	requireField(raw, 'uri', 'string');
	requireField(raw, 'tree_uri', 'string');
	requireField(raw, 'status', 'string');
	requireField(raw, 'phase', 'string');
	requireField(raw, 'cursor', 'string');
	requireField(raw, 'created_at', 'string');
	requireField(raw, 'updated_at', 'string');
	requireField(raw, 'schema_version', 'number');

	if (raw.schema_version !== 1) {
		throw new ParseExecutionError(
			`Unsupported execution schema_version: ${raw.schema_version}. Expected 1.`,
		);
	}

	if (!Array.isArray(raw.trace)) {
		throw new ParseExecutionError('Execution document is missing `trace` array.');
	}
	if (!isRecord(raw.tree)) {
		throw new ParseExecutionError('Execution document is missing `tree` object.');
	}
	if (!isRecord(raw.runtime)) {
		throw new ParseExecutionError('Execution document is missing `runtime` object.');
	}

	return raw as unknown as ExecutionDocument;
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireField(
	obj: Record<string, unknown>,
	key: string,
	type: 'string' | 'number',
): void {
	if (typeof obj[key] !== type) {
		throw new ParseExecutionError(
			`Execution document is missing or invalid field \`${key}\` (expected ${type}).`,
		);
	}
}
