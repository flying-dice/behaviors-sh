<script lang="ts">
  import type { Shape } from '../marketplace-data';
  import { miniLayout } from '../mini-layout';

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

  const layout = $derived(
    miniLayout(shape, {
      children: (s) => s.children ?? [],
      nodeW: NW,
      nodeH: NH,
      hGap: GAP,
      vGap: VGAP,
    }),
  );

  const scale = $derived(Math.min(width / layout.width, height / layout.height));
  const tx = $derived((width - layout.width * scale) / 2);
  const ty = $derived((height - layout.height * scale) / 2);
</script>

<svg {width} {height} class="block" data-testid={testid}>
  <g transform="translate({tx},{ty}) scale({scale})">
    {#each layout.wires as wire, i (i)}
      {@const A = layout.items[wire.from]}
      {@const B = layout.items[wire.to]}
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
    {#each layout.items as p, i (i)}
      {@const isLeaf = p.node.type === 'instruct'}
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
