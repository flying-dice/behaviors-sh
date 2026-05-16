<script lang="ts">
  import ActivityBar from './components/ActivityBar.svelte';
  import TopNav, { type Route } from './components/TopNav.svelte';
  import Home from './Home.svelte';
  import TreeEditor from './TreeEditor.svelte';
  import Marketplace from './Marketplace.svelte';
  import * as ws from '$lib/workspace/store.svelte';

  let route = $state<Route>('home');
  let currentTreeId = $state<string | null>(null);
  let theme = $state<'dark' | 'light'>('dark');

  // Derive the breadcrumb name from the open tree, if any.
  const currentTreeName = $derived.by(() => {
    if (!currentTreeId) return '—';
    const node = ws.getTree(currentTreeId);
    if (!node) return currentTreeId;
    return 'name' in node ? node.name : currentTreeId;
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  const workspaceOpen = $derived(ws.isOpen());

  $effect(() => {
    if (!workspaceOpen && route === 'designer') {
      currentTreeId = null;
      route = 'home';
    }
  });

  function openTree(id: string) {
    currentTreeId = id;
    route = 'designer';
  }

  function backToCollections() {
    currentTreeId = null;
    route = 'home';
  }
</script>

<div data-testid="app-root" class="grid h-screen grid-cols-[auto_1fr]">
  <ActivityBar
    testid="activity-bar"
    {route}
    onNavigate={(r) => (route = r)}
    {theme}
    onToggleTheme={toggleTheme}
  />

  <div class="grid min-h-0 grid-rows-[auto_1fr]">
    <TopNav
      testid="top-nav"
      {route}
      onNavigate={(r) => (route = r)}
      treeName={currentTreeName}
      onShare={() => {}}
      onSettings={() => {}}
    />

    <div data-testid="app-main" class="min-h-0 overflow-hidden">
      {#if route === 'home'}
        <Home
          testid="home"
          onOpenTree={openTree}
          onMarketplace={() => (route = 'marketplace')}
        />
      {:else if route === 'designer'}
        {#if currentTreeId}
          <TreeEditor
            testid="tree-editor"
            treeId={currentTreeId}
            onBack={backToCollections}
            onSwitchTree={openTree}
          />
        {:else}
          <Home
            testid="home"
            onOpenTree={openTree}
            onMarketplace={() => (route = 'marketplace')}
          />
        {/if}
      {:else}
        <Marketplace testid="marketplace" onInstall={() => (route = 'home')} />
      {/if}
    </div>
  </div>
</div>
