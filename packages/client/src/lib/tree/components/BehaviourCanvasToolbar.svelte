<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { ZOOM_MAX, ZOOM_MIN } from '../behaviour-layout';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Check from '@lucide/svelte/icons/check';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

  interface Props {
    treeId: string;
    treeName: string;
    zoom: number;
    valid: boolean;
    onZoom: (z: number) => void;
    onFit: () => void;
    testid?: string;
  }
  let {
    treeId,
    treeName,
    zoom,
    valid,
    onZoom,
    onFit,
    testid,
  }: Props = $props();
  const tid = $derived(makeTid(testid));
</script>

<div
  data-testid={testid}
  class="flex h-10 items-center gap-3 border-b bg-card px-4 text-[13px]"
>
  <span class="text-[11px] font-medium text-muted-foreground">tree</span>
  <span class="font-semibold" data-testid={tid('tree-name')}>{treeName}</span>
  <span class="font-mono text-[11px] text-muted-foreground" data-testid={tid('tree-id')}>
    {treeId}
  </span>
  {#if valid}
    <Badge
      variant="outline"
      class="border-abtree-green/35 bg-abtree-green/10 px-2 py-0 text-[11px] text-abtree-green"
      data-testid={tid('status-valid')}
    >
      <Check class="size-3" />
      valid
    </Badge>
  {:else}
    <Badge
      variant="outline"
      class="border-destructive/40 bg-destructive/10 px-2 py-0 text-[11px] text-destructive"
      data-testid={tid('status-invalid')}
    >
      <AlertTriangle class="size-3" />
      invalid
    </Badge>
  {/if}
  <div class="flex-1"></div>
  <Button
    variant="ghost"
    size="icon"
    title="Zoom out"
    onclick={() => onZoom(Math.max(ZOOM_MIN, zoom - 0.1))}
    data-testid={tid('zoom-out')}
  >
    <Minus />
  </Button>
  <span
    class="min-w-[42px] text-center font-mono text-[11px] text-muted-foreground"
    data-testid={tid('zoom-value')}
  >
    {Math.round(zoom * 100)}%
  </span>
  <Button
    variant="ghost"
    size="icon"
    title="Zoom in"
    onclick={() => onZoom(Math.min(ZOOM_MAX, zoom + 0.1))}
    data-testid={tid('zoom-in')}
  >
    <Plus />
  </Button>
  <Button variant="ghost" size="icon" title="Fit to view" onclick={onFit} data-testid={tid('fit')}>
    <Maximize />
  </Button>
</div>
