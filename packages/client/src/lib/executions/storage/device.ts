// Open an execution trace from the user's device. Mirrors the
// workspace `openFromDevice` flow — prefers the File System Access API
// (which gives back a handle we can re-read for live updates while
// the execution is running) and falls back to a hidden `<input type=file>`
// on browsers that don't support it.

import { pickFile } from '$lib/workspace/storage/dom-io';
import type { ExecutionDocument } from '@behaviors-ui/spec';
import { parseExecutionDoc } from '../serialize';

const PICKER_TYPES = [
	{
		description: 'Behaviour Execution Trace',
		accept: { 'application/json': ['.json'] as `.${string}`[] },
	},
];

interface FsaWindow {
	showOpenFilePicker?: (options?: {
		multiple?: boolean;
		types?: typeof PICKER_TYPES;
	}) => Promise<FileSystemFileHandle[]>;
}

const fsa = window as unknown as FsaWindow;

export interface OpenedExecution {
	doc: ExecutionDocument;
	handle?: FileSystemFileHandle;
	filename: string;
}

export async function openExecutionFromDevice(): Promise<OpenedExecution | null> {
	if (fsa.showOpenFilePicker) {
		let handle: FileSystemFileHandle;
		try {
			[handle] = await fsa.showOpenFilePicker({
				multiple: false,
				types: PICKER_TYPES,
			});
		} catch {
			return null;
		}
		const file = await handle.getFile();
		return {
			doc: parseExecutionDoc(await file.text()),
			handle,
			filename: file.name,
		};
	}
	return pickFile('.json,application/json', async (file) => ({
		doc: parseExecutionDoc(await file.text()),
		filename: file.name,
	}));
}

// Re-read the file via an existing handle. Used to poll a running
// execution. Returns null if the handle no longer resolves (file
// renamed / deleted / permission revoked).
export async function reloadFromHandle(
	handle: FileSystemFileHandle,
): Promise<ExecutionDocument | null> {
	try {
		const file = await handle.getFile();
		return parseExecutionDoc(await file.text());
	} catch {
		return null;
	}
}
