import type { Workspace } from "@behaviors-sh/spec";
import { parseWorkspace, serializeWorkspace, slugify } from "../serialize";
import { downloadBlob, pickFile } from "./dom-io";

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

async function pickFromDevice<T>(
    pickerTypes: typeof PICKER_TYPES,
    fallbackAccept: string,
    onFile: (file: File) => T | Promise<T>,
    onHandle?: (result: T, handle: FileSystemFileHandle) => T,
): Promise<T | null> {
    if (fsa.showOpenFilePicker) {
        let handle: FileSystemFileHandle;
        try {
            [handle] = await fsa.showOpenFilePicker({
                multiple: false,
                types: pickerTypes,
            });
        } catch {
            return null;
        }
        const file = await handle.getFile();
        const result = await onFile(file);
        return onHandle ? onHandle(result, handle) : result;
    }
    return pickFile(fallbackAccept, async (file) => onFile(file));
}

export async function openFromDevice(): Promise<OpenedFromDevice | null> {
    return pickFromDevice(
        PICKER_TYPES,
        `${FILE_EXT},.json,application/json`,
        async (file) => ({ workspace: parseWorkspace(await file.text()), filename: file.name }),
        (result, handle) => ({ ...result, handle }),
    );
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


function defaultFilenameStem(name: string): string {
    return slugify(name, "workspace");
}

export interface PickedFile {
    text: string;
    filename: string;
}

export async function pickTreeFile(): Promise<PickedFile | null> {
    return pickFromDevice(
        TREE_PICKER_TYPES,
        ".yaml,.yml,.json,application/x-yaml,application/json",
        async (file) => ({ text: await file.text(), filename: file.name }),
    );
}
