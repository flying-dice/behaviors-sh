<script lang="ts">
  import { makeTid } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-sh/spec';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Separator } from '$lib/components/ui/separator';
  import Folder from '@lucide/svelte/icons/folder';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import { Button } from '$lib/components/ui/button';
  import { type TreeSummary } from '$lib/workspace/store.svelte';
  import OutlineRow from './OutlineRow.svelte';
  import type { Path } from '../tree-ops';

  interface Props {
    workspaceName: string;
    trees: TreeSummary[];
    currentTreeId: string;
    root: BehaviourNode;
    selected: Path | null;
    onSwitchTree: (id: string) => void;
    onSelect: (path: Path) => void;
    onBack: () => void;
    testid?: string;
  }

  let {
    workspaceName,
    trees,
    currentTreeId,
    root,
    selected,
    onSwitchTree,
    onSelect,
    onBack,
    testid,
  }: Props = $props();
  const tid = $derived(makeTid(testid));
</script>

<aside data-testid={testid} class="flex h-full flex-col border-r bg-card">
  <div class="flex items-center gap-2 border-b px-3 py-2">
    <Button variant="ghost" class="h-7 px-2" onclick={onBack} data-testid={tid('back')}>
      <ArrowLeft class="size-3.5" /> Collections
    </Button>
  </div>

  <div class="px-4 pb-2 pt-4">
    <div class="mb-2 text-[11px] font-medium text-muted-foreground">Workspace</div>
    <div class="flex items-center gap-2 font-mono text-xs" data-testid={tid('workspace-name')}>
      <Folder class="size-3.5 text-primary" />
      {workspaceName}
    </div>
  </div>

  <div class="px-2 pb-3">
    <div class="px-2.5 pb-1.5 pt-2 text-[11px] font-medium text-muted-foreground">Trees</div>
    <div class="flex flex-col" data-testid={tid('tree-list')}>
      {#each trees as t (t.id)}
        <button
          onclick={() => onSwitchTree(t.id)}
          data-testid={tid(`tree-${t.id}`)}
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left font-mono text-xs transition-colors {t.id ===
          currentTreeId
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/50'}"
        >
          <span class="size-1.5 rounded-full bg-muted-foreground/40"></span>
          <span class="flex-1 truncate">{t.name}</span>
          <span class="text-[10px] text-muted-foreground">{t.nodes}</span>
        </button>
      {/each}
    </div>
  </div>

  <Separator />

  <div class="flex min-h-0 flex-1 flex-col">
    <div class="px-4 pb-1.5 pt-3 text-[11px] font-medium text-muted-foreground">Outline</div>
    <ScrollArea class="flex-1" data-testid={tid('outline')}>
      <div class="px-2 pb-6">
        <OutlineRow
          testid={tid('outline-row')}
          node={root}
          path={[]}
          {selected}
          {trees}
          {onSelect}
        />
      </div>
    </ScrollArea>
  </div>
</aside>
