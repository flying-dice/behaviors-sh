<script lang="ts">
  import type { BehaviourNode } from '@behaviors-ui/spec';
  import type { Path } from '../tree-ops';
  import { pathsEqual } from '../tree-ops';
  import { kindOf, KIND_META, nodeColor } from '../behaviour-layout';
  import { refToTreeId } from '../ref';
  import type { TreeSummary } from '$lib/workspace/store.svelte';
  import Self from './OutlineRow.svelte';

  interface Props {
    node: BehaviourNode;
    path: Path;
    selected: Path | null;
    trees: TreeSummary[];
    onSelect: (path: Path) => void;
    testid?: string;
  }
  let { node, path, selected, trees, onSelect, testid }: Props = $props();
  // Use the path as a unique suffix so nested rows get distinct testids.
  const rowId = $derived(path.length === 0 ? 'root' : path.join('-'));

  const depth = $derived(path.length);
  const isSelected = $derived(selected != null && pathsEqual(path, selected));

  const kind = $derived(kindOf(node));
  const meta = $derived(KIND_META[kind]);
  const color = $derived(nodeColor(kind));

  const label = $derived.by(() => {
    if ('$ref' in node) {
      const id = refToTreeId(node.$ref);
      if (!id) return '(pick a tree)';
      return trees.find((t) => t.id === id)?.name ?? id;
    }
    return node.name;
  });

  const typeLabel = $derived(meta.label);
</script>

<button
  type="button"
  onclick={() => onSelect(path)}
  data-testid={testid ? `${testid}-${rowId}` : undefined}
  class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-[12.5px] transition-colors hover:bg-muted/60 {isSelected ? 'bg-muted' : ''}"
  style:padding-left="{8 + depth * 14}px"
>
  <span
    class="grid size-4 place-items-center rounded-sm font-mono text-[11px]"
    style:color={color}
  >
    {meta.glyph}
  </span>
  <span class="flex-1 truncate font-mono">{label}</span>
  <span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
    {typeLabel}
  </span>
</button>

{#if !('$ref' in node) && node.type !== 'action'}
  {#each node.children as child, i (i)}
    <Self
      node={child}
      path={[...path, i]}
      {selected}
      {trees}
      {onSelect}
      {testid}
    />
  {/each}
{/if}
