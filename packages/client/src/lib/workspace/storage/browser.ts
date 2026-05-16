import type { Workspace } from "@behaviors-ui/behavior-spec";
import { parseWorkspace, serializeWorkspace, slugify } from "../serialize";
import type { BrowserSlot } from "../types";

// localStorage layout:
//   workspace:index   → JSON array of BrowserSlot
//   workspace:slot:<id> → serialized workspace
// We keep an index so the Open submenu can list slots without iterating
// every localStorage key.

const INDEX_KEY = "workspace:index";
const slotKey = (id: string) => `workspace:slot:${id}`;

function readIndex(): BrowserSlot[] {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as BrowserSlot[];
    } catch {
        return [];
    }
}

function writeIndex(slots: BrowserSlot[]) {
    localStorage.setItem(INDEX_KEY, JSON.stringify(slots));
}

function makeSlotId(name: string): string {
    const base = slugify(name, "workspace");
    const existing = new Set(readIndex().map((s) => s.id));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
}

export function listSlots(): BrowserSlot[] {
    return readIndex().sort((a, b) => b.savedAt - a.savedAt);
}

export function loadSlot(id: string): Workspace | null {
    const raw = localStorage.getItem(slotKey(id));
    if (!raw) return null;
    return parseWorkspace(raw);
}

export function saveToSlot(slotId: string, ws: Workspace): BrowserSlot {
    localStorage.setItem(slotKey(slotId), serializeWorkspace(ws));
    const index = readIndex();
    const existing = index.find((s) => s.id === slotId);
    const slot: BrowserSlot = {
        id: slotId,
        name: ws.name,
        savedAt: Date.now(),
    };
    if (existing) Object.assign(existing, slot);
    else index.push(slot);
    writeIndex(index);
    return slot;
}

export function saveAsNewSlot(ws: Workspace): BrowserSlot {
    return saveToSlot(makeSlotId(ws.name), ws);
}

export function deleteSlot(id: string) {
    localStorage.removeItem(slotKey(id));
    writeIndex(readIndex().filter((s) => s.id !== id));
}
