<script lang="ts">
  import { makeTid } from '$lib/utils';
  import type {
    ExecutionDocument,
    NodeStatus,
    TraceEntry as TraceEntryT,
  } from '@behaviors-sh/spec';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Badge } from '$lib/components/ui/badge';
  import Activity from '@lucide/svelte/icons/activity';
  import MousePointerSquare from '@lucide/svelte/icons/mouse-pointer-square-dashed';
  import { KIND_META, kindOf } from '$lib/tree/behaviour-layout';
  import { getAt, pathsEqual } from '$lib/tree/tree-ops';
  import type { Path } from '$lib/tree/tree-ops';
  import { decodeCursor, promptForCursor, statusKeyForPath } from '../cursor';
  import TraceEntry from './TraceEntry.svelte';

  interface Props {
    doc: ExecutionDocument;
    selected: Path | null;
    inFlightPath: Path | null;
    testid?: string;
  }
  let { doc, selected, inFlightPath, testid }: Props = $props();

  const tid = $derived(makeTid(testid));

  // Node at the selected path (when one is selected).
  const node = $derived.by(() => {
    if (!selected) return null;
    try {
      return getAt(doc.tree, selected);
    } catch {
      return null;
    }
  });

  const kind = $derived(node ? kindOf(node) : null);
  const meta = $derived(kind ? KIND_META[kind] : null);

  const status = $derived.by<NodeStatus | undefined>(() => {
    if (!selected) return undefined;
    return doc.runtime.node_status[statusKeyForPath(selected)];
  });

  const stepIdx = $derived.by<number | null>(() => {
    if (!selected) return null;
    const v = doc.runtime.step_index[statusKeyForPath(selected)];
    return typeof v === 'number' ? v : null;
  });

  const retryCount = $derived.by<number | null>(() => {
    if (!selected) return null;
    const v = doc.runtime.retry_count[statusKeyForPath(selected)];
    return typeof v === 'number' ? v : null;
  });

  const totalSteps = $derived.by<number | null>(() => {
    if (!node) return null;
    if ('steps' in node && Array.isArray(node.steps)) return node.steps.length;
    return null;
  });

  // Composites never emit their own trace entries — only the action
  // leaves below them do. Filter by prefix so selecting a composite
  // shows everything that happened in its subtree; selecting a leaf
  // narrows to that one action.
  function pathStartsWith(path: number[], prefix: number[]): boolean {
    if (prefix.length > path.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (path[i] !== prefix[i]) return false;
    }
    return true;
  }

  const entries = $derived.by<{ entry: TraceEntryT; index: number }[]>(() => {
    if (!selected) return [];
    const matches: { entry: TraceEntryT; index: number }[] = [];
    doc.trace.forEach((entry, index) => {
      const c = decodeCursor(entry.cursor);
      if (!c) return;
      if (pathStartsWith(c.path, selected)) {
        matches.push({ entry, index });
      }
    });
    return matches.reverse();
  });

  const isComposite = $derived(meta?.isComposite ?? false);

  const isLive = $derived(
    !!selected && !!inFlightPath && pathsEqual(selected, inFlightPath),
  );

  const STATUS_RING: Record<NodeStatus, string> = {
    success:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30',
    failure: 'bg-red-500/15 text-red-600 dark:text-red-300 ring-red-500/30',
    running:
      'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30',
  };
</script>

<div
  data-testid={testid}
  class="flex h-full min-h-0 flex-col"
>
  {#if !selected || !node}
    <div
      data-testid={tid('empty')}
      class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground"
    >
      <MousePointerSquare class="size-9 opacity-50" />
      <div class="text-[13px] font-medium text-foreground">Select a node</div>
      <p class="max-w-[260px] text-[11.5px] leading-relaxed">
        Click any node in the canvas to see its evaluate / instruct trace
        entries here.
      </p>
    </div>
  {:else}
    <header class="grid gap-2 border-b px-4 py-3">
      <div class="flex items-center gap-2">
        <span
          class="rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style="color: var({meta?.colorVar});"
          data-testid={tid('kind')}
        >
          {meta?.glyph}&nbsp;&nbsp;{meta?.label}
        </span>
        <h2
          class="min-w-0 truncate font-mono text-[13px] font-semibold tracking-tight text-foreground"
          data-testid={tid('name')}
        >
          {'name' in node ? node.name : '(ref)'}
        </h2>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <span class="font-mono">@{selected.join('.') || 'root'}</span>
        {#if status}
          <span
            class={[
              'inline-flex items-center rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset',
              STATUS_RING[status],
            ].join(' ')}
            data-testid={tid('status')}
          >
            {status}
          </span>
        {/if}
        {#if isLive}
          <Badge
            variant="secondary"
            class="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            data-testid={tid('live')}
          >
            in flight
          </Badge>
        {/if}
        {#if !isComposite && totalSteps != null && stepIdx != null}
          <span class="font-mono" data-testid={tid('step')}>
            step {Math.min(stepIdx, totalSteps)} / {totalSteps}
          </span>
        {:else if !isComposite && totalSteps != null}
          <span class="font-mono">{totalSteps} step{totalSteps === 1 ? '' : 's'}</span>
        {/if}
        {#if isComposite && 'children' in node && Array.isArray(node.children)}
          <span class="font-mono" data-testid={tid('children')}>
            {node.children.length} child{node.children.length === 1 ? '' : 'ren'}
          </span>
        {/if}
        {#if retryCount}
          <span class="font-mono" data-testid={tid('retries')}>
            retries: {retryCount}
          </span>
        {/if}
      </div>
    </header>

    {#if entries.length === 0}
      <div
        class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-muted-foreground"
        data-testid={tid('no-entries')}
      >
        <Activity class="size-7 opacity-50" />
        <div class="font-medium text-foreground">
          {isComposite ? 'Nothing in this subtree yet' : 'No trace entries yet'}
        </div>
        <p class="max-w-[260px] leading-relaxed">
          {#if isComposite}
            {meta?.label}s don't emit their own trace entries — only their
            action descendants do. None of this subtree's actions have been
            visited yet.
          {:else if isLive}
            Waiting for the agent to submit the first step here.
          {:else}
            This action hasn't been visited yet.
          {/if}
        </p>
      </div>
    {:else}
      <ScrollArea class="min-h-0 flex-1">
        <div class="flex flex-col gap-2 p-3" data-testid={tid('trace-list')}>
          {#each entries as item, i (item.index)}
            {@const promptInfo = promptForCursor(doc.tree, item.entry.cursor)}
            <TraceEntry
              entry={item.entry}
              index={item.index}
              isLatest={i === 0}
              {isLive}
              prompt={promptInfo?.text}
              varScope={doc.var}
              constScope={doc.const}
              testid={tid(`trace-${item.index}`)}
            />
          {/each}
        </div>
      </ScrollArea>
    {/if}
  {/if}
</div>
