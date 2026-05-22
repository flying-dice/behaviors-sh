<script lang="ts">
  import { makeTid } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-ui/spec';
  import {
    KIND_META,
    ZOOM_MAX,
    ZOOM_MIN,
    computeLayout,
    computeWires,
    leafPreview,
    nodeColor,
    pathKey,
    type LayoutItem,
  } from '../behaviour-layout';
  import type { Path } from '../tree-ops';
  import { pathsEqual } from '../tree-ops';
  import { refToTreeId } from '../ref';
  import type { TreeSummary } from '$lib/workspace/store.svelte';
  import Kbd from './Kbd.svelte';

  interface Props {
    root: BehaviourNode;
    selected: Path | null;
    pan: { x: number; y: number };
    zoom: number;
    trees: TreeSummary[];
    onSelect: (path: Path | null) => void;
    onPan: (pan: { x: number; y: number }) => void;
    onZoom: (zoom: number) => void;
    onContextMenu: (path: Path, x: number, y: number) => void;
    onOpenLinkedTree: (id: string) => void;
    testid?: string;
  }

  let {
    root,
    selected,
    pan,
    zoom,
    trees,
    onSelect,
    onPan,
    onZoom,
    onContextMenu,
    onOpenLinkedTree,
    testid,
  }: Props = $props();
  const tid = $derived(makeTid(testid));

  const treeNameById = $derived(
    new Map(trees.map((t) => [t.id, t.name] as const)),
  );

  const layout = $derived(computeLayout(root));
  const wires = $derived(computeWires(layout));

  let wrap = $state<HTMLDivElement | null>(null);
  let drag = $state<{ x: number; y: number; ox: number; oy: number } | null>(null);

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
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  function labelOf(node: BehaviourNode): string {
    if ('$ref' in node) {
      const id = refToTreeId(node.$ref);
      if (!id) return 'pick a tree…';
      return treeNameById.get(id) ?? id;
    }
    return node.name;
  }

  function refPreview(node: BehaviourNode): string | undefined {
    if (!('$ref' in node)) return undefined;
    const id = refToTreeId(node.$ref);
    return id ? `↪ open tree` : 'no tree selected';
  }

  function childrenCount(node: BehaviourNode): number {
    if ('$ref' in node || node.type === 'action') return 0;
    return node.children.length;
  }

  function tryOpenLink(node: BehaviourNode) {
    if (!('$ref' in node)) return;
    const id = refToTreeId(node.$ref);
    if (id) onOpenLinkedTree(id);
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
        <g
          class="node-hit"
          style="cursor:pointer"
          data-testid={tid(`node-${pathKey(it.path)}`)}
          onclick={(e) => {
            e.stopPropagation();
            onSelect(it.path);
          }}
          ondblclick={(e) => {
            if (it.kind !== 'ref') return;
            e.stopPropagation();
            tryOpenLink(it.node);
          }}
          oncontextmenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(it.path);
            onContextMenu(it.path, e.clientX, e.clientY);
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' && it.kind === 'ref') {
              e.preventDefault();
              tryOpenLink(it.node);
              return;
            }
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
              stroke="hsl(var(--border))"
              stroke-width="1.25"
            />
          {:else}
            <path
              d={nodePath(it)}
              fill="hsl(var(--card))"
              stroke="hsl(var(--border))"
              stroke-width="1.25"
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

          <text
            x={it.x + it.w / 2}
            y={isLeaf ? it.y + 38 : it.y + it.h / 2 + 6}
            text-anchor="middle"
            fill="hsl(var(--foreground))"
            style="font: 600 13px/1 var(--font-sans); letter-spacing: -0.005em; pointer-events:none;"
          >
            {preview(labelOf(it.node), 26)}
          </text>

          {#if isLeaf}
            {@const pv = it.kind === 'ref' ? refPreview(it.node) : leafPreview(it.node)}
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

          {#if !isLeaf && childrenCount(it.node) > 0}
            <text
              x={it.x + it.w - 10}
              y={it.y + 16}
              text-anchor="end"
              fill="hsl(var(--muted-foreground))"
              style="font: 400 10px/1 var(--font-mono); pointer-events:none;"
            >
              {childrenCount(it.node)}
              {childrenCount(it.node) === 1 ? 'child' : 'children'}
            </text>
          {/if}
        </g>
      {/each}
    </g>
  </svg>

  <div
    class="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-card/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground backdrop-blur"
  >
    <div><Kbd>drag</Kbd> pan · <Kbd>⌘ scroll</Kbd> zoom</div>
    <div><Kbd>click</Kbd> a node to inspect it</div>
  </div>
</div>

<style>
  :global(g.node-hit:focus),
  :global(g.node-hit:focus-visible) {
    outline: none;
  }
</style>
