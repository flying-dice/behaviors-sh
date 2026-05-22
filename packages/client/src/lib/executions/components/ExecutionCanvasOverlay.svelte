<script lang="ts">
  import { makeTid } from '$lib/utils';
  import { ZOOM_MAX, ZOOM_MIN } from '$lib/tree/behaviour-layout';
  import { Button } from '$lib/components/ui/button';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import Maximize from '@lucide/svelte/icons/maximize';
  import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
  import PanelRightClose from '@lucide/svelte/icons/panel-right-close';

  interface Props {
    zoom: number;
    inspectorOpen: boolean;
    onZoom: (z: number) => void;
    onFit: () => void;
    onToggleInspector: () => void;
    testid?: string;
  }
  let {
    zoom,
    inspectorOpen,
    onZoom,
    onFit,
    onToggleInspector,
    testid,
  }: Props = $props();

  const tid = $derived(makeTid(testid));
</script>

<div
  data-testid={testid}
  class="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border bg-card/85 px-1 py-1 shadow-sm backdrop-blur-sm"
>
  <Tooltip.Provider delayDuration={250}>
    <div class="pointer-events-auto flex items-center">
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="size-7"
              onclick={() => onZoom(Math.max(ZOOM_MIN, zoom - 0.1))}
              data-testid={tid('zoom-out')}
            >
              <Minus class="size-3.5" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Zoom out</Tooltip.Content>
      </Tooltip.Root>

      <span
        class="min-w-[44px] select-none text-center font-mono text-[10.5px] text-muted-foreground"
        data-testid={tid('zoom-value')}
      >
        {Math.round(zoom * 100)}%
      </span>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="size-7"
              onclick={() => onZoom(Math.min(ZOOM_MAX, zoom + 0.1))}
              data-testid={tid('zoom-in')}
            >
              <Plus class="size-3.5" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Zoom in</Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="size-7"
              onclick={onFit}
              data-testid={tid('fit')}
            >
              <Maximize class="size-3.5" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Fit to view</Tooltip.Content>
      </Tooltip.Root>

      <span class="mx-1 h-4 w-px bg-border"></span>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              class="size-7"
              onclick={onToggleInspector}
              data-testid={tid('toggle-inspector')}
            >
              {#if inspectorOpen}
                <PanelRightClose class="size-3.5" />
              {:else}
                <PanelRightOpen class="size-3.5" />
              {/if}
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="left">
          {inspectorOpen ? 'Hide inspector' : 'Show inspector'}
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </Tooltip.Provider>
</div>
