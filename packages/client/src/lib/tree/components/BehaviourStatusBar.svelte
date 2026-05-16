<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { pathKey } from '../behaviour-layout';
  import type { Path } from '../tree-ops';

  interface Props {
    workspaceName: string;
    nodeCount: number;
    selected: Path;
    zoom: number;
    dirty: boolean;
    testid?: string;
  }
  let { workspaceName, nodeCount, selected, zoom, dirty, testid }: Props = $props();
  const tid = $derived(makeTid(testid));
</script>

<footer
  data-testid={testid}
  class="flex h-7 items-center gap-4 border-t bg-card px-4 font-mono text-[11px] text-muted-foreground"
>
  <span class="flex items-center gap-1.5" data-testid={tid('workspace')}>
    <span class="size-1.5 rounded-full bg-abtree-green"></span>
    {workspaceName}
  </span>
  <span>·</span>
  <span data-testid={tid('node-count')}>{nodeCount} nodes</span>
  <div class="flex-1"></div>
  <span data-testid={tid('selection')}>↳ #/{pathKey(selected)}</span>
  <span>·</span>
  <span data-testid={tid('zoom')}>{Math.round(zoom * 100)}%</span>
  <span>·</span>
  <span class={dirty ? 'text-amber-500' : ''} data-testid={tid('dirty')}>
    {dirty ? 'unsaved' : 'saved'}
  </span>
</footer>
