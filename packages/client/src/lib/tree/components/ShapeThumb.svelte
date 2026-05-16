<script lang="ts">
  import type { Shape } from '../marketplace-data';

  interface Props {
    shape: Shape;
    width?: number;
    height?: number;
    accent?: string;
    testid?: string;
  }
  let {
    shape,
    width = 220,
    height = 84,
    accent = 'var(--color-abtree-cyan)',
    testid,
  }: Props = $props();

  const NW = 18;
  const NH = 10;
  const GAP = 8;
  const VGAP = 18;

  interface Measured {
    w: number;
    node: Shape;
    children: Measured[];
  }

  interface Placed {
    x: number;
    y: number;
    type: Shape['type'];
    cx: number;
    cy: number;
  }

  function measure(node: Shape): Measured {
    if (!node.children?.length) return { w: NW, node, children: [] };
    const kids = node.children.map(measure);
    const w = Math.max(NW, kids.reduce((s, k) => s + k.w, 0) + (kids.length - 1) * GAP);
    return { w, node, children: kids };
  }

  function place(m: Measured, x: number, depth: number, out: Placed[]) {
    const cw = m.children.length
      ? m.children.reduce((s, k) => s + k.w, 0) + (m.children.length - 1) * GAP
      : 0;
    let cx = x + (m.w - cw) / 2;
    let myCx: number;
    if (!m.children.length) myCx = x + m.w / 2;
    else {
      const first = cx + m.children[0].w / 2;
      const last = cx + cw - m.children[m.children.length - 1].w / 2;
      myCx = (first + last) / 2;
    }
    const y = depth * (NH + VGAP);
    out.push({ x: myCx - NW / 2, y, type: m.node.type, cx: myCx, cy: y + NH / 2 });
    for (const k of m.children) {
      place(k, cx, depth + 1, out);
      cx += k.w + GAP;
    }
  }

  function wireWalk(m: Measured, out: { wires: number[][]; idx: number }) {
    const myIndex = out.idx++;
    for (const k of m.children) {
      const childIndex = out.idx;
      wireWalk(k, out);
      out.wires.push([myIndex, childIndex]);
    }
  }

  const measured = $derived(measure(shape));
  const placed = $derived.by(() => {
    const out: Placed[] = [];
    place(measured, 0, 0, out);
    return out;
  });
  const wires = $derived.by(() => {
    const ctx = { wires: [] as number[][], idx: 0 };
    wireWalk(measured, ctx);
    return ctx.wires;
  });

  const maxX = $derived(Math.max(...placed.map((p) => p.x + NW), NW));
  const maxY = $derived(Math.max(...placed.map((p) => p.y + NH), NH));
  const scale = $derived(Math.min(width / maxX, height / maxY));
  const tx = $derived((width - maxX * scale) / 2);
  const ty = $derived((height - maxY * scale) / 2);
</script>

<svg {width} {height} class="block" data-testid={testid}>
  <g transform="translate({tx},{ty}) scale({scale})">
    {#each wires as [a, b], i (i)}
      {@const A = placed[a]}
      {@const B = placed[b]}
      {#if A && B}
        {@const midY = (A.cy + B.cy) / 2}
        <path
          d="M{A.cx} {A.cy + NH / 2} V{midY} H{B.cx} V{B.y}"
          stroke="var(--wire)"
          stroke-width={1 / scale}
          fill="none"
        />
      {/if}
    {/each}
    {#each placed as p, i (i)}
      {@const isLeaf = p.type === 'instruct'}
      {@const isRoot = i === 0}
      <rect
        x={p.x}
        y={p.y}
        width={NW}
        height={NH}
        fill={isRoot
          ? accent
          : isLeaf
            ? 'hsl(var(--muted))'
            : `color-mix(in srgb, ${accent} 24%, hsl(var(--card)))`}
        stroke={isRoot ? accent : 'hsl(var(--border))'}
        stroke-width={1 / scale}
      />
    {/each}
  </g>
</svg>
