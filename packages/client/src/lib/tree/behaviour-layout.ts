import { type BehaviourNode, stepBody, stepKind } from "@behaviors-sh/spec";
import { miniLayout } from "./mini-layout";
import { type CompositeType, isLeaf, type Path } from "./tree-ops";

export const NODE_W = 200;
export const NODE_H_COMP = 56;
export const NODE_H_LEAF = 76;
export const H_GAP = 28;
export const V_GAP = 64;

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 2.5;
export const ZOOM_FIT_MAX = 2.0;

export type NodeKind = "action" | "sequence" | "selector" | "parallel" | "ref";

export const KIND_META: Record<
	NodeKind,
	{
		label: string;
		glyph: string;
		colorVar: string;
		isComposite: boolean;
	}
> = {
	action: {
		label: "action",
		glyph: "▸",
		colorVar: "--color-abtree-green",
		isComposite: false,
	},
	sequence: {
		label: "sequence",
		glyph: "→",
		colorVar: "--color-abtree-purple",
		isComposite: true,
	},
	selector: {
		label: "selector",
		glyph: "?",
		colorVar: "--color-abtree-cyan",
		isComposite: true,
	},
	parallel: {
		label: "parallel",
		glyph: "‖",
		colorVar: "--color-abtree-pink",
		isComposite: true,
	},
	ref: {
		label: "tree",
		glyph: "↪",
		colorVar: "--color-abtree-pink",
		isComposite: false,
	},
};

export const COMPOSITE_TYPES = (Object.keys(KIND_META) as NodeKind[]).filter(
	(k) => KIND_META[k].isComposite,
) as CompositeType[];

export function kindOf(node: BehaviourNode): NodeKind {
	if ("$ref" in node) return "ref";
	return node.type;
}

export function nodeColor(kind: NodeKind): string {
	return `var(${KIND_META[kind].colorVar})`;
}

export function pathKey(path: Path): string {
	return path.join(".") || "root";
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

function children(node: BehaviourNode): BehaviourNode[] {
	if (isLeaf(node)) return [];
	return node.children;
}

export interface Layout {
	items: LayoutItem[];
	width: number;
	height: number;
}

export function computeLayout(root: BehaviourNode): Layout {
	const padding = 24;
	const mini = miniLayout(root, {
		children,
		nodeW: NODE_W,
		nodeH: NODE_H_COMP,
		hGap: H_GAP,
		vGap: V_GAP,
	});

	const items: LayoutItem[] = [];
	const depthOf = new Map<string, number>();
	let idx = 0;
	(function walk(
		node: BehaviourNode,
		path: Path,
		parentPath: Path | null,
		depth: number,
	) {
		const kind = kindOf(node);
		const h = KIND_META[kind].isComposite ? NODE_H_COMP : NODE_H_LEAF;
		depthOf.set(pathKey(path), depth);
		items.push({
			node,
			path,
			kind,
			x: mini.items[idx]!.x + padding,
			y: 0,
			w: NODE_W,
			h,
			parentPath,
		});
		idx++;
		children(node).forEach((c, i) => {
			walk(c, [...path, i], path, depth + 1);
		});
	})(root, [], null, 0);

	const maxDepth = items.reduce(
		(m, it) => Math.max(m, depthOf.get(pathKey(it.path)) ?? 0),
		0,
	);
	const rowY = [padding];
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

	const width = Math.max(...items.map((it) => it.x + it.w), 0) + padding;
	const height = Math.max(...items.map((it) => it.y + it.h), 0) + padding;
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
		if (it.kind === "action" || it.kind === "ref") continue;
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
	if ("$ref" in node) return undefined;
	if (node.type === "action") {
		const step = node.steps[0];
		if (!step) return undefined;
		const body = stepBody(step);
		const prefix = stepKind(step) === "evaluate" ? "⌘ " : "▸ ";
		return prefix + body;
	}
	return undefined;
}
