// Reactive store for the Executions page. Pure in-memory state for the
// lifetime of the tab — the trace file on disk is the source of truth,
// so there's no value in persisting a stale snapshot. On reload, the
// list is empty; the user re-picks files via `openFromDevice`.

import type { ExecutionDocument } from "@behaviors-sh/spec";
import {
    openExecutionFromDevice,
    reloadFromHandle,
    type OpenedExecution as PickedExecution,
} from "./storage/device";
import { classifyStatus } from "./format";

// One opened trace in the current session. `handle` is present only
// when the browser supports the File System Access API and the user
// opened via the picker (not the `<input type=file>` fallback). Without
// a handle there is no live re-read.
export interface OpenedExecution {
    id: string;
    doc: ExecutionDocument;
    handle?: FileSystemFileHandle;
    filename: string;
    openedAt: number;
}

let opened = $state<OpenedExecution[]>([]);
let currentId = $state<string | null>(null);
let error = $state<string | null>(null);
let loading = $state(false);

export function getOpened(): OpenedExecution[] {
    return opened;
}

export function getCurrentId(): string | null {
    return currentId;
}

export function getCurrentDoc(): ExecutionDocument | null {
    if (!currentId) return null;
    return opened.find((o) => o.id === currentId)?.doc ?? null;
}

export function getError(): string | null {
    return error;
}

export function isLoading(): boolean {
    return loading;
}

// True iff the current doc is running AND we have a live handle to
// re-read from. The page uses this to decide whether to poll.
export function isCurrentLive(): boolean {
    const entry = currentEntry();
    if (!entry) return false;
    if (classifyStatus(entry.doc.status) !== "running") return false;
    return !!entry.handle;
}

export async function openFromDevice(): Promise<void> {
    loading = true;
    try {
        const result = await openExecutionFromDevice();
        if (!result) return;
        adoptOpened(result);
        error = null;
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
    } finally {
        loading = false;
    }
}

export function selectExecution(id: string): void {
    if (!opened.some((o) => o.id === id)) return;
    currentId = id;
    error = null;
}

export function closeExecution(id: string): void {
    opened = opened.filter((o) => o.id !== id);
    if (currentId === id) currentId = opened[0]?.id ?? null;
}

// Re-read the file via its handle (if we have one). Used by the
// polling loop in the page. Stale-safe: if the active selection or
// the entry itself changed while the async read was in flight, the
// resolved snapshot is dropped instead of overwriting fresher state.
export async function refreshCurrent(): Promise<void> {
    const entry = currentEntry();
    if (!entry?.handle) return;
    const requestedId = entry.id;
    const next = await reloadFromHandle(entry.handle);
    if (!next) return;
    if (currentId !== requestedId) return;
    const stillOpen = opened.some((o) => o.id === requestedId);
    if (!stillOpen) return;
    opened = opened.map((o) =>
        o.id === requestedId ? { ...o, doc: next } : o,
    );
}

export function clearError(): void {
    error = null;
}

function currentEntry(): OpenedExecution | null {
    if (!currentId) return null;
    return opened.find((o) => o.id === currentId) ?? null;
}

function adoptOpened(picked: PickedExecution): void {
    const id = picked.doc.uri;
    const entry: OpenedExecution = {
        id,
        doc: picked.doc,
        handle: picked.handle,
        filename: picked.filename,
        openedAt: Date.now(),
    };
    // Opening the same URI again replaces the prior entry (and its
    // handle — the new pick might have read+write or be a different
    // file the user re-named).
    const existing = opened.findIndex((o) => o.id === id);
    if (existing >= 0) {
        opened = opened.map((o, i) => (i === existing ? entry : o));
    } else {
        opened = [entry, ...opened];
    }
    currentId = id;
}
