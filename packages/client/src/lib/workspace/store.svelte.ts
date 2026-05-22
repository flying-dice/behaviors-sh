import type { BehaviourNode, Workspace } from "@behaviors-sh/spec";
import { countNodes, kindOf } from "../tree/behaviour-layout";
import { emptyWorkspace } from "./serialize";
import * as browser from "./storage/browser";
import * as device from "./storage/device";
import type { BrowserSlot, WorkspaceSource } from "./types";
import { createTreeIn, deleteTreeIn, findTreeRefsIn, renameTreeIn, replaceTreeIn } from "./workspace-ops";

export interface TreeSummary {
    id: string;
    name: string;
    nodes: number;
    description?: string;
    kind: "action" | "sequence" | "selector" | "parallel" | "ref";
}

function summarize(id: string, node: BehaviourNode): TreeSummary {
    return {
        id,
        name: "name" in node ? node.name : id,
        nodes: countNodes(node),
        description: "description" in node ? node.description : undefined,
        kind: kindOf(node),
    };
}

let workspace = $state<Workspace | null>(null);
let source = $state<WorkspaceSource>({ kind: "none" });
let dirty = $state(false);

// Mirror of the browser-storage slot index. Reading localStorage isn't
// tracked by Svelte reactivity, so we hold the list in `$state` and keep
// it in sync on every save/delete.
let browserSlots = $state<BrowserSlot[]>(browser.listSlots());

function refreshBrowserSlots() {
    browserSlots = browser.listSlots();
}

function applyWorkspace(next: Workspace) {
    workspace = next;
    dirty = true;
}

export function getWorkspace(): Workspace | null {
    return workspace;
}

export function getSource(): WorkspaceSource {
    return source;
}

export function isDirty(): boolean {
    return dirty;
}

export function isOpen(): boolean {
    return workspace !== null;
}

export function listTrees(): TreeSummary[] {
    if (!workspace) return [];
    const entries = Object.entries(workspace.components.trees);
    return entries.map(([id, node]) => summarize(id, node));
}

export function getTree(id: string): BehaviourNode | null {
    return workspace?.components.trees[id] ?? null;
}

export function createTree(id: string, node: BehaviourNode) {
    if (!workspace) throw new Error("No workspace open.");
    applyWorkspace(createTreeIn(workspace, id, node));
}

export function replaceTree(id: string, node: BehaviourNode) {
    if (!workspace) throw new Error("No workspace open.");
    applyWorkspace(replaceTreeIn(workspace, id, node));
}

export function renameTree(oldId: string, newId: string) {
    if (!workspace) throw new Error("No workspace open.");
    applyWorkspace(renameTreeIn(workspace, oldId, newId));
}

export function deleteTree(id: string) {
    if (!workspace) throw new Error("No workspace open.");
    applyWorkspace(deleteTreeIn(workspace, id));
}

export function findTreeRefs(id: string): string[] {
    if (!workspace) return [];
    return findTreeRefsIn(workspace, id);
}

function setWorkspace(next: Workspace | null, nextSource: WorkspaceSource) {
    workspace = next;
    source = nextSource;
    dirty = false;
}

// ---- Mutations ---------------------------------------------------------

export function updateWorkspace(mutate: (ws: Workspace) => Workspace) {
    if (!workspace) return;
    workspace = mutate(workspace);
    dirty = true;
}

export function setName(name: string) {
    updateWorkspace((ws) => ({ ...ws, name }));
}

export function setVersion(version: string) {
    updateWorkspace((ws) => ({ ...ws, version }));
}

// ---- File menu actions -------------------------------------------------

export function newWorkspace(name = "untitled", version = "0.1.0") {
    setWorkspace(emptyWorkspace(name, version), { kind: "none" });
    dirty = true; // brand new, not yet persisted
}

export function closeWorkspace() {
    setWorkspace(null, { kind: "none" });
}

// Browser ----------------------------------------------------------------

export function listBrowserSlots(): BrowserSlot[] {
    return browserSlots;
}

export function openFromBrowser(slotId: string) {
    const ws = browser.loadSlot(slotId);
    if (!ws) return;
    const slot = browserSlots.find((s) => s.id === slotId);
    setWorkspace(ws, {
        kind: "browser",
        slotId,
        slotName: slot?.name ?? ws.name,
    });
}

// Overwrite an existing browser slot. Defaults to the current source's
// slot when called with no argument (plain "Save").
export function saveToBrowser(slotId?: string) {
    if (!workspace) return;
    const targetSlot =
        slotId ?? (source.kind === "browser" ? source.slotId : undefined);
    if (!targetSlot) {
        // No slot bound — caller should use saveAsNewBrowserSlot instead.
        saveAsNewBrowserSlot();
        return;
    }
    const slot = browser.saveToSlot(targetSlot, workspace);
    source = { kind: "browser", slotId: slot.id, slotName: slot.name };
    dirty = false;
    refreshBrowserSlots();
}

// Always allocates a fresh slot, even when a source slot is currently
// bound. This is the "Save As → New browser slot" path.
export function saveAsNewBrowserSlot() {
    if (!workspace) return;
    const slot = browser.saveAsNewSlot(workspace);
    source = { kind: "browser", slotId: slot.id, slotName: slot.name };
    dirty = false;
    refreshBrowserSlots();
}

export function deleteBrowserSlot(slotId: string) {
    browser.deleteSlot(slotId);
    if (source.kind === "browser" && source.slotId === slotId) {
        source = { kind: "none" };
    }
    refreshBrowserSlots();
}

// Device -----------------------------------------------------------------

export async function openFromDevice() {
    const opened = await device.openFromDevice();
    if (!opened) return;
    setWorkspace(opened.workspace, {
        kind: "device",
        handle: opened.handle,
        filename: opened.filename,
    });
}

export async function saveAsToDevice() {
    if (!workspace) return;
    const saved = await device.saveAsToDevice(workspace);
    if (!saved) return;
    source = {
        kind: "device",
        handle: saved.handle,
        filename: saved.filename,
    };
    dirty = false;
}

// Plain "Save": write back to wherever we came from. Falls through to a
// Save As prompt when the workspace was created via New.
export async function save() {
    if (!workspace) return;
    if (source.kind === "browser") {
        saveToBrowser(source.slotId);
        return;
    }
    if (source.kind === "device" && source.handle) {
        await device.saveToHandle(source.handle, workspace);
        dirty = false;
        return;
    }
    // No bound destination yet — fall back to Save As to device by
    // default, the most common path for a freshly created workspace.
    await saveAsToDevice();
}
