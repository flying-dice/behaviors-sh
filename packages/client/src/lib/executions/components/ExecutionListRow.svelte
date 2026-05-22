<script lang="ts">
  import { makeTid } from '$lib/utils';
  import X from '@lucide/svelte/icons/x';
  import type { OpenedExecution } from '../store.svelte';
  import { formatRelativeTime, shortenUri } from '../format';
  import StatusPill from './StatusPill.svelte';

  interface Props {
    entry: OpenedExecution;
    selected: boolean;
    onSelect: () => void;
    onClose: () => void;
    testid?: string;
  }
  let { entry, selected, onSelect, onClose, testid }: Props = $props();

  const tid = $derived(makeTid(testid));
  const name = $derived(shortenUri(entry.doc.uri));
</script>

<div
  class={[
    'group relative flex items-stretch border-l-2 transition-colors',
    selected ? 'border-primary bg-muted/60' : 'border-transparent hover:bg-muted/40',
  ].join(' ')}
  data-testid={testid}
>
  <button
    type="button"
    onclick={onSelect}
    aria-current={selected ? 'true' : undefined}
    class="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5 text-left"
    data-testid={tid('select')}
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div
          class="truncate font-mono text-[12.5px] font-medium text-foreground"
          title={entry.doc.uri}
          data-testid={tid('name')}
        >
          {name}
        </div>
        <div class="mt-0.5 truncate text-[11px] text-muted-foreground">
          {entry.doc.tree.type === 'ref' ? '(ref)' : entry.doc.tree.name} · {entry.doc.tree.type}
        </div>
      </div>
      <StatusPill status={entry.doc.status} testid={tid('status')} />
    </div>
    <div class="flex items-center justify-between text-[10.5px] text-muted-foreground">
      <span>
        {entry.doc.trace.length} {entry.doc.trace.length === 1 ? 'event' : 'events'}
      </span>
      <span>{formatRelativeTime(entry.doc.updated_at)}</span>
    </div>
  </button>
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation();
      onClose();
    }}
    aria-label="Close trace"
    title="Close trace"
    data-testid={tid('close')}
    class="grid w-7 place-items-center text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100"
  >
    <X class="size-3.5" />
  </button>
</div>
