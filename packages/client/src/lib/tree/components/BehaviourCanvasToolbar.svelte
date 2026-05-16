<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { ZOOM_MAX, ZOOM_MIN } from '../behaviour-layout';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import Maximize from '@lucide/svelte/icons/maximize';
  import Check from '@lucide/svelte/icons/check';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import Download from '@lucide/svelte/icons/download';

  interface Props {
    treeId: string;
    treeName: string;
    zoom: number;
    valid: boolean;
    yaml: string;
    onZoom: (z: number) => void;
    onFit: () => void;
    testid?: string;
  }
  let {
    treeId,
    treeName,
    zoom,
    valid,
    yaml,
    onZoom,
    onFit,
    testid,
  }: Props = $props();
  const tid = $derived(makeTid(testid));

  let copied = $state(false);

  function copyYaml() {
    navigator.clipboard?.writeText(yaml);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function downloadYaml() {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${treeId}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }
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
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button
          variant="ghost"
          size="icon"
          title="Copy YAML"
          onclick={copyYaml}
          data-testid={tid('copy-yaml')}
        >
          {#if copied}
            <Check class="size-4 text-abtree-green" />
          {:else}
            <ClipboardCopy class="size-4" />
          {/if}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Copy YAML</Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Button
          variant="ghost"
          size="icon"
          title="Download YAML"
          onclick={downloadYaml}
          data-testid={tid('download-yaml')}
        >
          <Download class="size-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Download YAML</Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
  <div class="mx-1 h-4 w-px bg-border"></div>
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
