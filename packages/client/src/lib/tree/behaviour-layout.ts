import { stepBody, stepKind, type BehaviourNode } from '@behaviors-ui/behavior-spec';
import { isLeaf, type Path } from './tree-ops';

export const NODE_W = 200;
export const NODE_H_COMP = 56;
export const NODE_H_LEAF = 76;
export const H_GAP = 28;
export const V_GAP = 64;

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 2.5;
export const ZOOM_FIT_MAX = 2.0;

export type NodeKind = 'action' | 'sequence' | 'selector' | 'parallel' | 'ref';

export const KIND_META: Record<NodeKind, {
    label: string;
    glyph: string;
    colorVar: string;
    isComposite: boolean;
}> = {
    action: {
        label: 'action',
        glyph: '▸',
        colorVar: '--color-abtree-green',
        isComposite: false,
    },
    sequence: {
        label: 'sequence',
        glyph: '→',
        colorVar: '--color-abtree-purple',
        isComposite: true,
    },
    selector: {
        label: 'selector',
        glyph: '?',
        colorVar: '--color-abtree-cyan',
        isComposite: true,
    },
    parallel: {
        label: 'parallel',
        glyph: '‖',
        colorVar: '--color-abtree-pink',
        isComposite: true,
    },
    ref: {
        label: 'tree',
        glyph: '↪',
        colorVar: '--color-abtree-pink',
        isComposite: false,
    },
};

export function kindOf(node: BehaviourNode): NodeKind {
    if ('$ref' in node) return 'ref';
    return node.type;
}

export function nodeColor(kind: NodeKind): string {
    return `var(${KIND_META[kind].colorVar})`;
}

export function pathKey(path: Path): string {
    return path.join('.') || 'root';
}

export interface LayoutItem {
    node: BehaviourNode;
    path: Path;
    kind: NodeKind;
    x: number;
    y: number;
    w: number;
    h: number;
    parentPath: Path | null;
}

// TODO: 5 - DRY: measure/place algorithm duplicates the generic version in mini-layout.ts
interface Measured {
    w: number;
    h: number;
    node: BehaviourNode;
    children: Measured[];
}

function children(node: BehaviourNode): BehaviourNode[] {
    if (isLeaf(node)) return [];
    return node.children;
}

function measure(node: BehaviourNode): Measured {
    const kind = kindOf(node);
    const isLeaf = !KIND_META[kind].isComposite;
    const h = isLeaf ? NODE_H_LEAF : NODE_H_COMP;
    const kids = children(node).map(measure);
    if (!kids.length) return { w: NODE_W, h, node, children: [] };
    const childrenW = kids.reduce((s, k) => s + k.w, 0) + (kids.length - 1) * H_GAP;
    return { w: Math.max(NODE_W, childrenW), h, node, children: kids };
}

export interface Layout {
    items: LayoutItem[];
    width: number;
    height: number;
}

export function computeLayout(root: BehaviourNode): Layout {
    const items: LayoutItem[] = [];

    function place(m: Measured, x: number, path: Path, parentPath: Path | null) {
        const cw = m.children.length
            ? m.children.reduce((s, k) => s + k.w, 0) + (m.children.length - 1) * H_GAP
            : 0;
        let cx = x + (m.w - cw) / 2;
        let myCx: number;
        if (!m.children.length) {
            myCx = x + m.w / 2;
        } else {
            const first = cx + m.children[0]!.w / 2;
            const last = cx + cw - m.children[m.children.length - 1]!.w / 2;
            myCx = (first + last) / 2;
        }
        items.push({
            node: m.node,
            path,
            kind: kindOf(m.node),
            x: myCx - NODE_W / 2,
            y: 0,
            w: NODE_W,
            h: m.h,
            parentPath,
        });
        m.children.forEach((k, i) => {
            place(k, cx, [...path, i], path);
            cx += k.w + H_GAP;
        });
    }

    const measured = measure(root);
    place(measured, 24, [], null);

    // Snap rows by depth so siblings line up.
    const depthOf = new Map<string, number>();
    (function walk(node: BehaviourNode, path: Path, d: number) {
        depthOf.set(pathKey(path), d);
        children(node).forEach((c, i) => walk(c, [...path, i], d + 1));
    })(root, [], 0);

    const maxDepth = items.reduce(
        (m, it) => Math.max(m, depthOf.get(pathKey(it.path)) ?? 0),
        0,
    );
    const rowY = [24];
    for (let d = 0; d < maxDepth + 1; d++) {
        const rowItems = items.filter(
            (it) => (depthOf.get(pathKey(it.path)) ?? 0) === d,
        );
        const maxH = rowItems.length
            ? Math.max(...rowItems.map((it) => it.h))
            : NODE_H_COMP;
        rowY[d + 1] = rowY[d]! + maxH + V_GAP;
    }
    for (const it of items) it.y = rowY[depthOf.get(pathKey(it.path)) ?? 0]!;

    const width = Math.max(...items.map((it) => it.x + it.w), 0) + 24;
    const height = Math.max(...items.map((it) => it.y + it.h), 0) + 24;
    return { items, width, height };
}

export interface Wire {
    key: string;
    from: LayoutItem;
    to: LayoutItem;
}

export function computeWires(layout: Layout): Wire[] {
    const byKey = new Map(layout.items.map((it) => [pathKey(it.path), it]));
    const wires: Wire[] = [];
    for (const it of layout.items) {
        if (it.kind === 'action' || it.kind === 'ref') continue;
        const childCount = children(it.node).length;
        for (let i = 0; i < childCount; i++) {
            const child = byKey.get(pathKey([...it.path, i]));
            if (!child) continue;
            wires.push({
                key: `${pathKey(it.path)}->${pathKey(child.path)}`,
                from: it,
                to: child,
            });
        }
    }
    return wires;
}

export function countNodes(root: BehaviourNode): number {
    let n = 1;
    for (const c of children(root)) n += countNodes(c);
    return n;
}

// Short, human-friendly preview of a leaf node's main payload — used in
// the canvas for action steps. The canvas renders its own preview for
// ref/tree-link leaves so it can resolve the linked tree's display name.
export function leafPreview(node: BehaviourNode): string | undefined {
    if ('$ref' in node) return undefined;
    if (node.type === 'action') {
        const step = node.steps[0];
        if (!step) return undefined;
        const body = stepBody(step);
        const prefix = stepKind(step) === 'evaluate' ? '⌘ ' : '▸ ';
        return prefix + body;
    }
    return undefined;
}
