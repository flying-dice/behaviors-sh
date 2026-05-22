<script lang="ts">
import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
import Pencil from "@lucide/svelte/icons/pencil";
import Trash2 from "@lucide/svelte/icons/trash-2";
import { Badge } from "$lib/components/ui/badge";
import { Card, CardContent } from "$lib/components/ui/card";
import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
import { makeTid } from "$lib/utils";
import { getTree, type TreeSummary } from "$lib/workspace/store.svelte";
import { type NodeKind, nodeColor } from "../behaviour-layout";
import { shapeFromTree } from "../marketplace-data";
import ShapeThumb from "./ShapeThumb.svelte";

interface Props {
	tree: TreeSummary;
	onOpen: () => void;
	onRename: () => void;
	onDelete: () => void;
	testid?: string;
}
let { tree, onOpen, onRename, onDelete, testid }: Props = $props();
const tid = $derived(makeTid(testid));

const shape = $derived.by(() => {
	const node = getTree(tree.id);
	return node ? shapeFromTree(node) : { type: "instruct" as const };
});

const dotColor = $derived(nodeColor(tree.kind as NodeKind));

function onCardKey(e: KeyboardEvent) {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		onOpen();
	}
}
</script>

<div
  role="button"
  tabindex="0"
  data-testid={testid}
  class="block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
  onclick={onOpen}
  onkeydown={onCardKey}
>
  <Card
    class="h-full gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary"
  >
    <CardContent class="flex flex-col gap-3 p-0">
      <div class="flex items-center gap-2">
        <span
          class="size-2 rounded-full"
          style:background={dotColor}
          aria-hidden="true"
        ></span>
        <span class="flex-1 truncate text-[15px] font-semibold leading-tight">{tree.name}</span>
        {#if tree.kind === 'ref'}
          <Badge
            variant="outline"
            class="border-behaviors-pink/35 bg-behaviors-pink/10 px-2 py-0 text-[10px] text-behaviors-pink"
          >
            link
          </Badge>
        {/if}
        <div
          role="presentation"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  aria-label="Tree actions"
                  data-testid={tid('menu')}
                  class="grid size-6 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal class="size-3.5" />
                </button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="w-40">
              <DropdownMenu.Item onclick={onRename} data-testid={tid('rename')}>
                <Pencil />
                <span>Rename…</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                variant="destructive"
                onclick={onDelete}
                data-testid={tid('delete')}
              >
                <Trash2 />
                <span>Delete…</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      <div class="grid h-20 place-items-center rounded-md border bg-background px-2">
        <ShapeThumb {shape} width={220} height={64} accent={dotColor} />
      </div>

      {#if tree.description}
        <p class="line-clamp-2 text-xs text-muted-foreground">{tree.description}</p>
      {/if}

      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{tree.nodes} {tree.nodes === 1 ? 'node' : 'nodes'}</span>
        <span class="flex-1"></span>
        <span class="truncate font-mono text-[10.5px]">{tree.id}</span>
      </div>
    </CardContent>
  </Card>
</div>
