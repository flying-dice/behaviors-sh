<script lang="ts">
  import { makeTid } from '$lib/utils';
  import type { BehaviourNode, NodeStatus } from '@behaviors-sh/spec';
  import {
    KIND_META,
    ZOOM_MAX,
    ZOOM_MIN,
    computeLayout,
    computeWires,
    nodeColor,
    pathKey,
    type LayoutItem,
  } from '$lib/tree/behaviour-layout';
  import type { Path } from '$lib/tree/tree-ops';
  import { pathsEqual } from '$lib/tree/tree-ops';
  import Kbd from '$lib/tree/components/Kbd.svelte';
  import { canvasKeyForPath } from '../cursor';

  interface Props {
    root: BehaviourNode;
    selected: Path | null;
    pan: { x: number; y: number };
    zoom: number;
    // Map of `pathKey(path)` → status. Drives the colored border + dot
    // overlay on each node. Unstatused nodes render with the default
    // border (faded muted-foreground).
    statusByPath: Record<string, NodeStatus>;
    // Path of the action currently in flight (cursor.path while phase
    // is evaluating/performing). Renders with a pulsing ring so the
    // user can spot live activity at a glance.
    inFlightPath: Path | null;
    // Monotonically-increasing counter. Whenever it changes we
    // re-fit the tree to the viewport. The parent owns the value so it
    // can wire it to a toolbar button (`token++`) and to a tree-change
    // effect (auto-fit on open).
    fitToken: number;
    onSelect: (path: Path | null) => void;
    onPan: (pan: { x: number; y: number }) => void;
    onZoom: (zoom: number) => void;
    testid?: string;
  }

  let {
    root,
    selected,
    pan,
    zoom,
    statusByPath,
    inFlightPath,
    fitToken,
    onSelect,
    onPan,
    onZoom,
    testid,
  }: Props = $props();

  const tid = $derived(makeTid(testid));

  const layout = $derived(computeLayout(root));
  const wires = $derived(computeWires(layout));

  let wrap = $state<HTMLDivElement | null>(null);
  let drag = $state<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  // Auto-fit when `fitToken` ticks. We measure the viewport, compute a
  // zoom that frames the whole tree with a padding margin, and centre
  // the layout in the viewport. Bumping the token is how the parent
  // requests a fit (toolbar click + tree-change effect).
  $effect(() => {
    void fitToken;
    queueMicrotask(() => {
      if (!wrap) return;
      const vw = wrap.clientWidth;
      const vh = wrap.clientHeight;
      if (!vw || !vh || !layout.width || !layout.height) return;
      const padding = 48;
      const zx = (vw - padding * 2) / layout.width;
      const zy = (vh - padding * 2) / layout.height;
      // Mirrors TreeEditor's behaviour: clamp the "fit" zoom so a tiny
      // tree doesn't blow up to 2.5× and so a huge tree still fits.
      const FIT_MAX = 2.0;
      const next = Math.max(ZOOM_MIN, Math.min(FIT_MAX, Math.min(zx, zy)));
      const contentW = layout.width * next;
      const contentH = layout.height * next;
      onZoom(next);
      onPan({ x: (vw - contentW) / 2, y: (vh - contentH) / 2 });
    });
  });

  function onMouseDown(e: MouseEvent) {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    if (t === wrap || t.tagName === 'svg' || t.classList.contains('canvas-bg')) {
      drag = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y };
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!drag) return;
    onPan({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) });
  }

  function onMouseUp() {
    drag = null;
  }

  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      onZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * (1 + delta))));
    } else {
      onPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
    }
  }

  function onCanvasClick(e: MouseEvent) {
    const t = e.target as Element | null;
    if (!t) return;
    if (t.closest('.node-hit')) return;
    onSelect(null);
  }

  function nodePath(it: LayoutItem) {
    const { x, y, w, h } = it;
    const chamfer = 12;
    return `M${x + chamfer} ${y} H${x + w - chamfer} L${x + w} ${y + h / 2} L${x + w - chamfer} ${y + h} H${
      x + chamfer
    } L${x} ${y + h / 2} Z`;
  }

  function wirePath(from: LayoutItem, to: LayoutItem) {
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h;
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const midY = y1 + (y2 - y1) / 2;
    return `M${x1} ${y1} V${midY} H${x2} V${y2}`;
  }

  function preview(text: string | undefined, n = 28) {
    if (!text) return '';
    const t = text.replace(/\s+/g, ' ');
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
  }

  // Normalised-tree preview. The execution document stores the
  // post-normalize shape (`{kind, expression|instruction}`), not the
  // input shape (`{evaluate|instruct}`) that `leafPreview` in
  // behaviour-layout expects. Replicating the logic locally instead of
  // teaching the layout helper two formats.
  function leafPreviewNormalized(node: BehaviourNode): string | undefined {
    if ('$ref' in node) return undefined;
    if (node.type !== 'action') return undefined;
    const step = node.steps[0] as
      | { kind: 'evaluate'; expression: string }
      | { kind: 'instruct'; instruction: string }
      | undefined;
    if (!step) return undefined;
    const prefix = step.kind === 'evaluate' ? '⌘ ' : '▸ ';
    const body = step.kind === 'evaluate' ? step.expression : step.instruction;
    return prefix + body;
  }

  // The runtime stores `node_status` under `path.join('.')` with `""`
  // for root; behaviour-layout's `pathKey` returns `"root"` for root.
  // The store layer normalises this difference for us, so we look up
  // status using `canvasKeyForPath` for everything except root.
  function statusOf(it: LayoutItem): NodeStatus | undefined {
    const flat = it.path.join('.');
    // runtime key (empty string for root) is the source of truth.
    return statusByPath[flat] ?? statusByPath[canvasKeyForPath(it.path)];
  }

  function strokeFor(status: NodeStatus | undefined, isLive: boolean): string {
    if (isLive) return 'rgb(245 158 11)'; // amber-500
    if (status === 'success') return 'rgb(16 185 129)'; // emerald-500
    if (status === 'failure') return 'rgb(239 68 68)'; // red-500
    if (status === 'running') return 'rgb(245 158 11)';
    return 'hsl(var(--border))';
  }
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} />

<div
  bind:this={wrap}
  data-testid={testid}
  onmousedown={onMouseDown}
  onwheel={onWheel}
  onclick={onCanvasClick}
  oncontextmenu={(e) => e.preventDefault()}
  role="presentation"
  class="relative h-full w-full overflow-hidden bg-background"
  style="cursor: {drag ? 'grabbing' : 'default'}"
>
  <div
    class="canvas-bg pointer-events-none absolute inset-0 opacity-50"
    style="
      background-image: radial-gradient(circle, color-mix(in srgb, hsl(var(--primary)) 18%, transparent) 1px, transparent 1px);
      background-size: 24px 24px;
      background-position: {pan.x}px {pan.y}px;
    "
  ></div>

  <svg
    width={layout.width}
    height={layout.height}
    style="position:absolute; left:0; top:0; transform-origin: 0 0; transform: translate({pan.x}px, {pan.y}px) scale({zoom});"
  >
    <g>
      {#each wires as w (w.key)}
        <path
          d={wirePath(w.from, w.to)}
          stroke="var(--wire)"
          stroke-width="1.25"
          fill="none"
        />
      {/each}
    </g>
    <g>
      {#each layout.items as it (pathKey(it.path))}
        {@const meta = KIND_META[it.kind]}
        {@const isLeaf = !meta.isComposite}
        {@const isSelected = selected != null && pathsEqual(it.path, selected)}
        {@const status = statusOf(it)}
        {@const isLive = inFlightPath != null && pathsEqual(it.path, inFlightPath)}
        {@const stroke = strokeFor(status, isLive)}
        {@const strokeWidth = status || isLive ? 2 : 1.25}
        <g
          class="node-hit"
          style="cursor:pointer"
          data-testid={tid(`node-${pathKey(it.path)}`)}
          onclick={(e) => {
            e.stopPropagation();
            onSelect(it.path);
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(it.path);
            }
          }}
          role="button"
          tabindex="0"
        >
          {#if isLeaf}
            <rect
              x={it.x}
              y={it.y}
              width={it.w}
              height={it.h}
              fill="hsl(var(--card))"
              stroke={stroke}
              stroke-width={strokeWidth}
            />
          {:else}
            <path
              d={nodePath(it)}
              fill="hsl(var(--card))"
              stroke={stroke}
              stroke-width={strokeWidth}
            />
          {/if}

          {#if isLive}
            <!-- Pulse ring on the in-flight node. Two concentric
                 outlines that animate via the CSS keyframes below. -->
            <rect
              class="pulse-ring"
              x={it.x - 4}
              y={it.y - 4}
              width={it.w + 8}
              height={it.h + 8}
              fill="none"
              stroke="rgb(245 158 11)"
              stroke-width="1.5"
              rx={isLeaf ? 0 : 16}
            />
          {/if}

          {#if isSelected}
            <g stroke="hsl(var(--primary))" stroke-width="2" fill="none">
              {#each [[it.x - 6, it.y - 6, 1, 1], [it.x + it.w + 6, it.y - 6, -1, 1], [it.x - 6, it.y + it.h + 6, 1, -1], [it.x + it.w + 6, it.y + it.h + 6, -1, -1]] as [cx, cy, dx, dy]}
                <path d="M{cx + 8 * dx} {cy} H{cx} V{cy + 8 * dy}" />
              {/each}
            </g>
          {/if}

          <text
            x={it.x + 10}
            y={it.y + 16}
            fill={nodeColor(it.kind)}
            style="font: 500 10px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; pointer-events:none;"
          >
            {meta.glyph}&nbsp;&nbsp;{meta.label}
          </text>

          {#if status || isLive}
            <!-- Small status dot in the top-right corner. Mirrors the
                 status pill colors so a quick scan tells you what
                 happened to each node. -->
            <circle
              cx={it.x + it.w - 10}
              cy={it.y + 12}
              r={4}
              fill={stroke}
              style="pointer-events:none;"
            />
          {/if}

          <text
            x={it.x + it.w / 2}
            y={isLeaf ? it.y + 38 : it.y + it.h / 2 + 6}
            text-anchor="middle"
            fill="hsl(var(--foreground))"
            style="font: 600 13px/1 var(--font-sans); letter-spacing: -0.005em; pointer-events:none;"
          >
            {preview('name' in it.node ? it.node.name : '(ref)', 26)}
          </text>

          {#if isLeaf && 'type' in it.node && it.node.type !== 'ref'}
            {@const pv = leafPreviewNormalized(it.node)}
            {#if pv}
              <text
                x={it.x + it.w / 2}
                y={it.y + 58}
                text-anchor="middle"
                fill="hsl(var(--muted-foreground))"
                style="font: 400 11px/1.2 var(--font-mono); pointer-events:none;"
              >
                {preview(pv)}
              </text>
            {/if}
          {/if}
        </g>
      {/each}
    </g>
  </svg>

  <div
    class="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-card/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground backdrop-blur"
  >
    <div><Kbd>drag</Kbd> pan · <Kbd>⌘ scroll</Kbd> zoom</div>
    <div><Kbd>click</Kbd> a node to inspect its trace</div>
  </div>
</div>

<style>
  :global(g.node-hit:focus),
  :global(g.node-hit:focus-visible) {
    outline: none;
  }
  :global(.pulse-ring) {
    animation: pulse-ring 1.6s ease-in-out infinite;
    transform-origin: center;
  }
  @keyframes pulse-ring {
    0%, 100% {
      opacity: 0.55;
    }
    50% {
      opacity: 0.15;
    }
  }
</style>
