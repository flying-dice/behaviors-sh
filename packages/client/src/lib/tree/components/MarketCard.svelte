<script lang="ts">
import Check from "@lucide/svelte/icons/check";
import Download from "@lucide/svelte/icons/download";
import Star from "@lucide/svelte/icons/star";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent } from "$lib/components/ui/card";
import { makeTid } from "$lib/utils";
import { formatCount, type MarketItem } from "../marketplace-data";
import ShapeThumb from "./ShapeThumb.svelte";

interface Props {
	item: MarketItem;
	onOpen: () => void;
	onInstall: () => void;
	testid?: string;
}
let { item, onOpen, onInstall, testid }: Props = $props();
const tid = $derived(makeTid(testid));

const accent = $derived(`hsl(var(--behaviors-${item.colorHint}))`);
</script>

<Card
  data-testid={testid}
  class="cursor-pointer gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary"
>
  <CardContent class="flex flex-col gap-3 p-0">
    <button
      onclick={onOpen}
      data-testid={tid('thumb')}
      class="grid h-24 place-items-center overflow-hidden rounded-md border bg-background"
    >
      <ShapeThumb shape={item.shape} width={260} height={84} {accent} />
    </button>

    <button onclick={onOpen} class="text-left" data-testid={tid('body')}>
      <div class="mb-1 flex items-center gap-1.5">
        <span class="text-[15px] font-semibold">{item.name}</span>
        {#if item.verified}
          <Check class="size-3.5 text-behaviors-cyan" stroke-width="2.5" />
        {/if}
      </div>
      <p class="mb-1.5 text-[13px] leading-snug text-muted-foreground">{item.blurb}</p>
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{item.author}</span>
        <span>·</span>
        <span class="font-mono text-primary">v{item.version}</span>
      </div>
    </button>

    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1 text-xs text-muted-foreground">
        <Download class="size-3" /> {formatCount(item.downloads)}
      </span>
      <span class="flex items-center gap-1 text-xs text-muted-foreground">
        <Star class="size-3 fill-behaviors-yellow text-behaviors-yellow" /> {item.stars}
      </span>
      <div class="flex-1"></div>
      <Button variant="outline" size="sm" onclick={onInstall} data-testid={tid('install')}>
        <Download /> Install
      </Button>
    </div>
  </CardContent>
</Card>
