export interface MiniLayoutConfig<T> {
	children: (node: T) => T[];
	nodeW: number;
	nodeH: number;
	hGap: number;
	vGap: number;
}

export interface MiniNode<T> {
	node: T;
	x: number;
	y: number;
	cx: number;
	cy: number;
}

export interface MiniWire {
	from: number;
	to: number;
}

export interface MiniLayoutResult<T> {
	items: MiniNode<T>[];
	wires: MiniWire[];
	width: number;
	height: number;
}

interface Measured<T> {
	w: number;
	node: T;
	children: Measured<T>[];
}

function measure<T>(node: T, config: MiniLayoutConfig<T>): Measured<T> {
	const kids = config.children(node).map((c) => measure(c, config));
	if (!kids.length) return { w: config.nodeW, node, children: [] };
	const w = Math.max(
		config.nodeW,
		kids.reduce((s, k) => s + k.w, 0) + (kids.length - 1) * config.hGap,
	);
	return { w, node, children: kids };
}

function place<T>(
	m: Measured<T>,
	x: number,
	depth: number,
	config: MiniLayoutConfig<T>,
	out: MiniNode<T>[],
	wireCtx: { wires: MiniWire[]; idx: number },
) {
	const myIndex = wireCtx.idx++;
	const cw = m.children.length
		? m.children.reduce((s, k) => s + k.w, 0) +
			(m.children.length - 1) * config.hGap
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
	const y = depth * (config.nodeH + config.vGap);
	out.push({
		node: m.node,
		x: myCx - config.nodeW / 2,
		y,
		cx: myCx,
		cy: y + config.nodeH / 2,
	});
	for (const k of m.children) {
		const childIndex = wireCtx.idx;
		place(k, cx, depth + 1, config, out, wireCtx);
		wireCtx.wires.push({ from: myIndex, to: childIndex });
		cx += k.w + config.hGap;
	}
}

export function miniLayout<T>(
	root: T,
	config: MiniLayoutConfig<T>,
): MiniLayoutResult<T> {
	const items: MiniNode<T>[] = [];
	const wireCtx = { wires: [] as MiniWire[], idx: 0 };
	const measured = measure(root, config);
	place(measured, 0, 0, config, items, wireCtx);
	const width = Math.max(
		...items.map((it) => it.x + config.nodeW),
		config.nodeW,
	);
	const height = Math.max(
		...items.map((it) => it.y + config.nodeH),
		config.nodeH,
	);
	return { items, wires: wireCtx.wires, width, height };
}
