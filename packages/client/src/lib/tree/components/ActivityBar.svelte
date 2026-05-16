<script lang="ts">
  import { makeTid } from "$lib/utils";
  import * as Tooltip from '$lib/components/ui/tooltip';
  import FolderKanban from '@lucide/svelte/icons/folder-kanban';
  import Store from '@lucide/svelte/icons/store';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import TreeMark from './TreeMark.svelte';
  import type { Route } from './TopNav.svelte';

  interface Props {
    route: Route;
    onNavigate: (r: Route) => void;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    testid?: string;
  }
  let { route, onNavigate, theme, onToggleTheme, testid }: Props = $props();

  const tid = $derived(makeTid(testid));

  const items: { id: Route; label: string; icon: typeof FolderKanban }[] = [
    { id: 'home', label: 'Collection', icon: FolderKanban },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ];
</script>

<Tooltip.Provider delayDuration={400}>
  <aside
    data-testid={testid}
    class="flex h-full w-14 flex-col items-center border-r bg-card py-2"
    aria-label="Activity bar"
  >
    <button
      onclick={() => onNavigate('home')}
      class="mb-3 grid size-10 place-items-center text-primary"
      aria-label="abtree"
      data-testid={tid('logo')}
    >
      <TreeMark size={22} stroke={3} />
    </button>

    <nav class="flex flex-col gap-1">
      {#each items as item (item.id)}
        {@const Icon = item.icon}
        {@const active = route === item.id || (item.id === 'home' && route === 'designer')}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                onclick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                data-testid={tid(`nav-${item.id}`)}
                class="group relative grid size-10 cursor-pointer place-items-center rounded-md transition-colors {active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'}"
              >
                {#if active}
                  <span
                    class="absolute -left-2 top-1.5 h-7 w-0.5 rounded-r bg-primary"
                    aria-hidden="true"
                  ></span>
                {/if}
                <Icon class="size-5" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{item.label}</Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </nav>

    <div class="flex-1"></div>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            onclick={onToggleTheme}
            aria-label="Toggle theme"
            data-testid={tid('theme-toggle')}
            class="grid size-10 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {#if theme === 'dark'}
              <Moon class="size-4" />
            {:else}
              <Sun class="size-4" />
            {/if}
          </button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="right">Toggle theme</Tooltip.Content>
    </Tooltip.Root>

    <div
      class="mt-1 flex size-8 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold"
    >
      fd
    </div>
  </aside>
</Tooltip.Provider>
