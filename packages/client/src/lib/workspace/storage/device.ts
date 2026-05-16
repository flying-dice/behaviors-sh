import type { Workspace } from "@behaviors-ui/behavior-spec";
import { parseWorkspace, serializeWorkspace, slugify } from "../serialize";

const FILE_EXT = ".workspace.json";
const PICKER_TYPES = [
    {
        description: "Behaviour Workspace",
        accept: { "application/json": [FILE_EXT, ".json"] as `.${string}`[] },
    },
];

const TREE_PICKER_TYPES = [
    {
        description: "Behaviour Tree",
        accept: {
            "application/x-yaml": [".yaml", ".yml"] as `.${string}`[],
            "application/json": [".json"] as `.${string}`[],
        },
    },
];

interface FsaWindow {
    showOpenFilePicker?: (options?: {
        multiple?: boolean;
        types?: typeof PICKER_TYPES;
    }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: {
        suggestedName?: string;
        types?: typeof PICKER_TYPES;
    }) => Promise<FileSystemFileHandle>;
}

const fsa = window as unknown as FsaWindow;

export function hasFileSystemAccess(): boolean {
    return typeof fsa.showOpenFilePicker === "function";
}

export interface OpenedFromDevice {
    workspace: Workspace;
    handle?: FileSystemFileHandle;
    filename: string;
}

export async function openFromDevice(): Promise<OpenedFromDevice | null> {
    if (fsa.showOpenFilePicker) {
        let handle: FileSystemFileHandle;
        try {
            [handle] = await fsa.showOpenFilePicker({
                multiple: false,
                types: PICKER_TYPES,
            });
        } catch {
            return null; // user cancelled
        }
        const file = await handle.getFile();
        const workspace = parseWorkspace(await file.text());
        return { workspace, handle, filename: file.name };
    }
    return openFromDeviceFallback();
}

function pickFileFallback<T>(
    accept: string,
    process: (file: File) => Promise<T>,
): Promise<T | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.style.display = "none";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return resolve(null);
            try {
                resolve(await process(file));
            } catch (err) {
                reject(err);
            }
        });
        input.addEventListener("cancel", () => {
            input.remove();
            resolve(null);
        });
        document.body.appendChild(input);
        input.click();
    });
}

function openFromDeviceFallback(): Promise<OpenedFromDevice | null> {
    return pickFileFallback(`${FILE_EXT},.json,application/json`, async (file) => {
        const workspace = parseWorkspace(await file.text());
        return { workspace, filename: file.name };
    });
}

export interface SavedToDevice {
    handle?: FileSystemFileHandle;
    filename: string;
}

export async function saveAsToDevice(ws: Workspace): Promise<SavedToDevice | null> {
    const suggestedName = `${defaultFilenameStem(ws.name)}${FILE_EXT}`;
    if (fsa.showSaveFilePicker) {
        let handle: FileSystemFileHandle;
        try {
            handle = await fsa.showSaveFilePicker({
                suggestedName,
                types: PICKER_TYPES,
            });
        } catch {
            return null;
        }
        await writeHandle(handle, ws);
        return { handle, filename: handle.name };
    }
    downloadBlob(serializeWorkspace(ws), suggestedName);
    return { filename: suggestedName };
}

export async function saveToHandle(
    handle: FileSystemFileHandle,
    ws: Workspace,
): Promise<void> {
    await writeHandle(handle, ws);
}

async function writeHandle(handle: FileSystemFileHandle, ws: Workspace) {
    // Handles returned by showOpenFilePicker are read-only by default;
    // createWritable() rejects with NotAllowedError unless readwrite
    // permission has been granted. showSaveFilePicker handles return
    // readwrite already, so this is a no-op for them.
    await ensureReadwritePermission(handle);
    const writable = await (
        handle as FileSystemFileHandle & {
            createWritable: () => Promise<FileSystemWritableFileStream>;
        }
    ).createWritable();
    await writable.write(serializeWorkspace(ws));
    await writable.close();
}

type PermissionMode = "read" | "readwrite";
type PermissionState = "granted" | "denied" | "prompt";
interface PermissionableHandle {
    queryPermission?: (opts: {
        mode: PermissionMode;
    }) => Promise<PermissionState>;
    requestPermission?: (opts: {
        mode: PermissionMode;
    }) => Promise<PermissionState>;
}

async function ensureReadwritePermission(handle: FileSystemFileHandle) {
    const h = handle as FileSystemFileHandle & PermissionableHandle;
    const opts = { mode: "readwrite" as const };
    if (h.queryPermission) {
        if ((await h.queryPermission(opts)) === "granted") return;
    }
    if (h.requestPermission) {
        if ((await h.requestPermission(opts)) === "granted") return;
    }
    throw new Error(
        "Write permission for the workspace file was not granted.",
    );
}

function downloadBlob(text: string, filename: string) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function defaultFilenameStem(name: string): string {
    return slugify(name, "workspace");
}

export interface PickedFile {
    text: string;
    filename: string;
}

export async function pickTreeFile(): Promise<PickedFile | null> {
    if (fsa.showOpenFilePicker) {
        let handle: FileSystemFileHandle;
        try {
            [handle] = await fsa.showOpenFilePicker({
                multiple: false,
                types: TREE_PICKER_TYPES,
            });
        } catch {
            return null;
        }
        const file = await handle.getFile();
        return { text: await file.text(), filename: file.name };
    }
    return pickTreeFileFallback();
}

function pickTreeFileFallback(): Promise<PickedFile | null> {
    return pickFileFallback(
        ".yaml,.yml,.json,application/x-yaml,application/json",
        async (file) => ({ text: await file.text(), filename: file.name }),
    );
}
