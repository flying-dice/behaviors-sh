<script lang="ts">
import FileUp from "@lucide/svelte/icons/file-up";
import Search from "@lucide/svelte/icons/search";
import { Badge } from "$lib/components/ui/badge";
import { Button } from "$lib/components/ui/button";
import { ScrollArea } from "$lib/components/ui/scroll-area";
import { makeTid } from "$lib/utils";
import { classifyStatus } from "../format";
import type { OpenedExecution } from "../store.svelte";
import ExecutionListRow from "./ExecutionListRow.svelte";

interface Props {
	entries: OpenedExecution[];
	selectedId: string | null;
	loading: boolean;
	onOpen: () => void;
	onSelect: (id: string) => void;
	onClose: (id: string) => void;
	testid?: string;
}
let { entries, selectedId, loading, onOpen, onSelect, onClose, testid }: Props =
	$props();

const tid = $derived(makeTid(testid));

let filter = $state("");
const filtered = $derived(
	entries.filter((e) => {
		if (!filter) return true;
		const f = filter.toLowerCase();
		return (
			e.doc.uri.toLowerCase().includes(f) ||
			e.filename.toLowerCase().includes(f) ||
			(e.doc.tree.type !== "ref" &&
				e.doc.tree.name.toLowerCase().includes(f)) ||
			e.doc.status.toLowerCase().includes(f)
		);
	}),
);

const runningCount = $derived(
	entries.filter((e) => classifyStatus(e.doc.status) === "running").length,
);
</script>

<aside
  data-testid={testid}
  class="flex h-full min-h-0 flex-col border-r bg-card/30"
>
  <div class="flex items-center gap-2 border-b px-3 py-2">
    <h2 class="text-[12.5px] font-semibold tracking-tight">Opened traces</h2>
    <Badge variant="secondary" data-testid={tid('count')}>{entries.length}</Badge>
    {#if runningCount > 0}
      <Badge
        variant="secondary"
        class="bg-amber-500/15 text-amber-700 dark:text-amber-300"
        data-testid={tid('running-count')}
      >
        {runningCount} running
      </Badge>
    {/if}
  </div>

  <div class="border-b px-3 py-2">
    <Button
      onclick={onOpen}
      data-testid={tid('open')}
      class="mb-2 w-full"
      disabled={loading}
    >
      <FileUp />
      {loading ? 'Opening…' : 'Open trace file'}
    </Button>
    {#if entries.length > 0}
      <div class="flex h-7 items-center gap-2 rounded-md border px-2.5">
        <Search class="size-3.5 text-muted-foreground" />
        <input
          bind:value={filter}
          placeholder="Filter…"
          class="flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          data-testid={tid('filter')}
        />
      </div>
    {/if}
  </div>

  <div class="min-h-0 flex-1">
    {#if entries.length === 0}
      <div
        data-testid={tid('empty')}
        class="px-3 py-6 text-center text-[11px] text-muted-foreground"
      >
        Open a trace JSON file to view it. Traces you open stay in this list
        until you close them or reload the tab.
      </div>
    {:else if filtered.length === 0}
      <div
        data-testid={tid('no-matches')}
        class="px-3 py-6 text-center text-xs text-muted-foreground"
      >
        No traces match “{filter}”.
      </div>
    {:else}
      <ScrollArea class="h-full">
        <div class="flex flex-col">
          {#each filtered as entry (entry.id)}
            <ExecutionListRow
              entry={entry}
              selected={selectedId === entry.id}
              onSelect={() => onSelect(entry.id)}
              onClose={() => onClose(entry.id)}
              testid={tid(`row-${entry.id}`)}
            />
          {/each}
        </div>
      </ScrollArea>
    {/if}
  </div>
</aside>
