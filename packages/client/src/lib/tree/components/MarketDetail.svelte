<script lang="ts">
import Check from "@lucide/svelte/icons/check";
import ChevronLeft from "@lucide/svelte/icons/chevron-left";
import Download from "@lucide/svelte/icons/download";
import GitBranch from "@lucide/svelte/icons/git-branch";
import Star from "@lucide/svelte/icons/star";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent } from "$lib/components/ui/card";
import { ScrollArea } from "$lib/components/ui/scroll-area";
import { makeTid } from "$lib/utils";
import type { MarketItem } from "../marketplace-data";
import ShapeThumb from "./ShapeThumb.svelte";

interface Props {
	item: MarketItem;
	onBack: () => void;
	onInstall: () => void;
	testid?: string;
}
let { item, onBack, onInstall, testid }: Props = $props();
const tid = $derived(makeTid(testid));

const accent = $derived(`hsl(var(--behaviors-${item.colorHint}))`);
</script>

<ScrollArea class="h-full" data-testid={testid}>
  <div class="mx-auto max-w-[1100px] px-12 pb-16 pt-6">
    <Button variant="outline" class="mb-5" onclick={onBack} data-testid={tid('back')}>
      <ChevronLeft /> Back to marketplace
    </Button>

    <Card class="mb-6 p-0">
      <CardContent class="flex flex-wrap items-start gap-8 p-8">
        <div class="min-w-[280px] flex-1">
          <div class="mb-2.5 flex items-center gap-2.5">
            <span class="text-[11px] font-medium text-primary">{item.id}</span>
            {#if item.verified}
              <Badge
                variant="outline"
                class="border-behaviors-cyan/35 bg-behaviors-cyan/10 text-behaviors-cyan"
              >
                <Check class="size-3" /> verified
              </Badge>
            {/if}
          </div>
          <h1 class="mb-2 text-[32px] font-semibold leading-[1.1] tracking-tight">{item.name}</h1>
          <p class="mb-4 max-w-[560px] text-[15px] leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          <div class="mb-5 flex gap-3.5 text-[13px] text-muted-foreground">
            <span>{item.author}</span>
            <span>·</span>
            <span class="font-mono text-primary">v{item.version}</span>
            <span>·</span>
            <span>{item.updated}</span>
          </div>
          <div class="flex items-center gap-2">
            <Button onclick={onInstall} data-testid={tid('install')}>
              <Download /> Install into project
            </Button>
            <Button variant="outline" data-testid={tid('fork')}>
              <GitBranch /> Fork
            </Button>
            <Button variant="outline" data-testid={tid('star')}>
              <Star class="fill-behaviors-yellow text-behaviors-yellow" /> Star
            </Button>
          </div>
        </div>

        <Card class="w-[260px] min-w-[240px] bg-background p-0">
          <CardContent class="p-3.5">
            <div class="mb-2.5 flex justify-between text-[13px]">
              <span class="text-muted-foreground">Downloads</span>
              <span>{item.downloads.toLocaleString()}</span>
            </div>
            <div class="mb-2.5 flex justify-between text-[13px]">
              <span class="text-muted-foreground">Stars</span>
              <span>{item.stars}</span>
            </div>
            <div class="mb-2.5 flex justify-between text-[13px]">
              <span class="text-muted-foreground">Nodes</span>
              <span>{item.nodes}</span>
            </div>
            <div class="mt-3.5 flex flex-wrap gap-1.5">
              {#each item.tags as t (t)}
                <Badge variant="secondary">{t}</Badge>
              {/each}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>

    <div class="grid grid-cols-[1.5fr_1fr] gap-6">
      <Card class="p-0">
        <CardContent class="p-5">
          <div class="mb-2.5 text-[11px] font-medium text-muted-foreground">Tree shape</div>
          <div
            class="grid min-h-[240px] place-items-center rounded-md border bg-background p-5"
          >
            <ShapeThumb shape={item.shape} width={500} height={220} {accent} />
          </div>
          <div class="mt-3.5 text-[13px] leading-relaxed text-muted-foreground">
            {item.nodes} nodes · root is a
            <span class="font-mono" style="color: {accent}">{item.shape.type}</span>. Install to
            inspect and edit each node.
          </div>
        </CardContent>
      </Card>

      <Card class="p-0">
        <CardContent class="p-5">
          <div class="mb-2.5 text-[11px] font-medium text-muted-foreground">Install</div>
          <pre
            class="m-0 overflow-auto rounded-md border bg-background p-4 font-mono text-[13px] leading-relaxed">
<span class="text-muted-foreground"># import from the marketplace</span>
<span class="text-primary">$</span> behaviors-sh pull {item.id}
<span class="text-muted-foreground"># or compose inline</span>
imports:
  - <span>"@{item.author.replace('@', '')}/{item.id}@{item.version}"</span></pre>
        </CardContent>
      </Card>
    </div>
  </div>
</ScrollArea>
