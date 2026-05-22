<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import * as Select from '$lib/components/ui/select';
  import Search from '@lucide/svelte/icons/search';
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import Rocket from '@lucide/svelte/icons/rocket';
  import Layers from '@lucide/svelte/icons/layers';
  import Cpu from '@lucide/svelte/icons/cpu';
  import X from '@lucide/svelte/icons/x';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import { MARKETPLACE, type MarketItem } from './marketplace-data';
  import MarketCard from './components/MarketCard.svelte';
  import MarketDetail from './components/MarketDetail.svelte';

  const INTEREST_URL = 'https://github.com/anthropics/behaviors-sh/issues/1';

  interface Props {
    onInstall: (item: MarketItem) => void;
    testid?: string;
  }
  let { onInstall, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let q = $state('');
  let tag = $state<string>('all');
  let sort = $state<'popular' | 'stars' | 'recent'>('popular');
  let detail = $state<MarketItem | null>(null);

  const allTags = $derived.by(() => {
    const m = new Map<string, number>();
    for (const it of MARKETPLACE) for (const t of it.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  });

  const filtered = $derived.by(() => {
    const ql = q.toLowerCase();
    let list = MARKETPLACE.filter((it) => {
      if (tag !== 'all' && !it.tags.includes(tag)) return false;
      if (!ql) return true;
      return (
        it.name.toLowerCase().includes(ql) ||
        it.author.toLowerCase().includes(ql) ||
        it.tags.some((t) => t.includes(ql))
      );
    });
    if (sort === 'popular') list = list.sort((a, b) => b.downloads - a.downloads);
    else if (sort === 'stars') list = list.sort((a, b) => b.stars - a.stars);
    else list = list.sort((a, b) => a.updated.localeCompare(b.updated));
    return list;
  });

  const categories = [
    { id: 'all', label: 'All trees', icon: GitBranch },
    { id: 'games', label: 'Games', icon: Cpu },
    { id: 'deploy', label: 'Deploy & ops', icon: Rocket },
    { id: 'data', label: 'Data', icon: Layers },
  ];

  const sortLabels = {
    popular: 'Most downloads',
    stars: 'Most stars',
    recent: 'Recently updated',
  } as const;
</script>

{#if detail}
  <MarketDetail
    testid={tid('detail')}
    item={detail}
    onBack={() => (detail = null)}
    onInstall={() => onInstall(detail!)}
  />
{:else}
  <div data-testid={testid} class="relative h-full overflow-hidden">
    <!-- Marketplace content (blurred behind overlay) -->
    <div class="pointer-events-none h-full select-none blur-[2px]">
      <div class="grid h-full grid-cols-[260px_1fr] overflow-hidden">
    <!-- sidebar -->
    <aside class="overflow-auto border-r bg-card p-5" data-testid={tid('sidebar')}>
      <div class="mb-3 text-[11px] font-medium text-muted-foreground">Marketplace</div>
      <div class="mb-5 flex flex-col gap-1">
        {#each categories as c (c.id)}
          {@const Icon = c.icon}
          <button
            onclick={() => (tag = c.id === 'all' ? 'all' : c.id)}
            data-testid={tid(`category-${c.id}`)}
            class="flex items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors {tag ===
            c.id
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
          >
            <Icon class="size-3.5" />
            {c.label}
          </button>
        {/each}
      </div>
      <div class="mb-2 text-[11px] font-medium text-muted-foreground">Tags</div>
      <div class="flex flex-col gap-0.5">
        {#each allTags as [t, n] (t)}
          <button
            onclick={() => (tag = t)}
            data-testid={tid(`tag-${t}`)}
            class="flex justify-between rounded px-2 py-1 text-left font-mono text-xs transition-colors {tag ===
            t
              ? 'bg-[var(--brand-soft)] text-primary'
              : 'text-muted-foreground hover:bg-muted/50'}"
          >
            <span># {t}</span><span>{n}</span>
          </button>
        {/each}
      </div>
    </aside>

    <!-- main -->
    <ScrollArea class="h-full">
      <div class="px-8 pb-16 pt-6">
        <Card class="mb-6 p-0">
          <CardContent class="p-7">
            <div class="text-[11px] font-medium text-primary">Marketplace</div>
            <h1 class="mb-1 mt-2 text-2xl font-semibold tracking-tight">
              Behaviours, by the community.
            </h1>
            <p class="m-0 max-w-[560px] text-sm text-muted-foreground">
              Drop battle-tested trees into your project. Fork, compose, contribute back.
            </p>
          </CardContent>
        </Card>

        <div class="mb-5 flex items-center gap-3">
          <div class="flex h-8 max-w-[480px] flex-1 items-center gap-2 rounded-md border px-3">
            <Search class="size-3.5 text-muted-foreground" />
            <input
              class="flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Search trees, authors, tags…"
              bind:value={q}
              data-testid={tid('search')}
            />
          </div>
          <div class="flex-1"></div>
          <Select.Root type="single" bind:value={sort}>
            <Select.Trigger class="w-44" data-testid={tid('sort-trigger')}>
              {sortLabels[sort]}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="popular" data-testid={tid('sort-popular')}>
                Most downloads
              </Select.Item>
              <Select.Item value="stars" data-testid={tid('sort-stars')}>Most stars</Select.Item>
              <Select.Item value="recent" data-testid={tid('sort-recent')}>
                Recently updated
              </Select.Item>
            </Select.Content>
          </Select.Root>
          {#if tag !== 'all'}
            <Button
              variant="outline"
              onclick={() => (tag = 'all')}
              data-testid={tid('clear-tag')}
            >
              <X /> #{tag}
            </Button>
          {/if}
        </div>

        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4"
          data-testid={tid('grid')}
        >
          {#each filtered as it (it.id)}
            <MarketCard
              testid={tid(`item-${it.id}`)}
              item={it}
              onOpen={() => (detail = it)}
              onInstall={() => onInstall(it)}
            />
          {/each}
        </div>

        {#if filtered.length === 0}
          <div class="py-16 text-center text-muted-foreground">
            No trees match. Try clearing filters.
          </div>
        {/if}
      </div>
    </ScrollArea>
      </div>
    </div>

    <!-- Coming Soon overlay -->
    <div
      data-testid={tid('coming-soon-overlay')}
      class="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
    >
      <div class="flex max-w-md flex-col items-center gap-6 rounded-xl border border-border/50 bg-card/95 px-12 py-10 shadow-2xl backdrop-blur-sm">
        <div class="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Sparkles class="size-7 text-primary" />
        </div>
        <div class="flex flex-col items-center gap-2 text-center">
          <h2 class="text-2xl font-semibold tracking-tight">Coming Soon</h2>
          <p class="max-w-[320px] text-sm leading-relaxed text-muted-foreground">
            The community marketplace is under construction. Share and discover
            battle-tested behaviour trees built by the community.
          </p>
        </div>
        <Button
          data-testid={tid('register-interest')}
          class="gap-2"
          onclick={() => window.open(INTEREST_URL, '_blank')}
        >
          <ExternalLink class="size-4" />
          Register your interest
        </Button>
        <p class="text-xs text-muted-foreground/70">
          Vote on the GitHub issue to help us prioritise
        </p>
      </div>
    </div>
  </div>
{/if}
