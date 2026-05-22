<script lang="ts">
import Search from "@lucide/svelte/icons/search";
import Settings from "@lucide/svelte/icons/settings";
import Share2 from "@lucide/svelte/icons/share-2";
import { Button } from "$lib/components/ui/button";
import { makeTid } from "$lib/utils";
import FileMenu from "./FileMenu.svelte";
import Kbd from "./Kbd.svelte";

export type Route = "home" | "designer" | "marketplace" | "executions";

interface Props {
	route: Route;
	onNavigate: (r: Route) => void;
	treeName: string;
	onShare: () => void;
	onSettings: () => void;
	testid?: string;
}

let { route, onNavigate, treeName, onShare, onSettings, testid }: Props =
	$props();

const tid = $derived(makeTid(testid));

const routeLabel: Record<Route, string> = {
	home: "Collection",
	designer: "Designer",
	marketplace: "Marketplace",
	executions: "Executions",
};
</script>

<header
  data-testid={testid}
  class="flex h-10 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur"
>
  <FileMenu testid={tid('file-menu')} />

  <span class="text-muted-foreground">/</span>

  {#if route === 'designer'}
    <button
      data-testid={tid('breadcrumb-collection')}
      class="font-mono text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      onclick={() => onNavigate('home')}
    >collection</button>
    <span class="text-muted-foreground">/</span>
    <span
      data-testid={tid('breadcrumb-tree')}
      class="font-mono text-[12.5px] text-foreground"
    >{treeName}</span>
  {:else}
    <button
      data-testid={tid('breadcrumb-route')}
      class="font-mono text-[12.5px] text-foreground"
      onclick={() => onNavigate(route)}
    >
      {routeLabel[route].toLowerCase()}
    </button>
  {/if}

  <div class="flex-1"></div>

  <div
    data-testid={tid('search')}
    class="flex h-7 w-[280px] items-center gap-2 rounded-md border px-2.5 text-xs text-muted-foreground"
  >
    <Search class="size-3.5" />
    <span class="flex-1">Search trees, nodes…</span>
    <Kbd>⌘K</Kbd>
  </div>

  {#if route === 'designer'}
    <Button variant="outline" onclick={onSettings} data-testid={tid('settings')}>
      <Settings />
      Settings
    </Button>
    <Button onclick={onShare} data-testid={tid('share')}>
      <Share2 />
      Share
    </Button>
  {/if}
</header>
