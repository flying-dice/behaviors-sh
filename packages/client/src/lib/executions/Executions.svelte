<script lang="ts">
import Activity from "@lucide/svelte/icons/activity";
import FileUp from "@lucide/svelte/icons/file-up";
import { Button } from "$lib/components/ui/button";
import { makeTid } from "$lib/utils";
import ExecutionDetail from "./components/ExecutionDetail.svelte";
import ExecutionList from "./components/ExecutionList.svelte";
import * as store from "./store.svelte";

interface Props {
	testid?: string;
}
let { testid }: Props = $props();

const tid = $derived(makeTid(testid));

const entries = $derived(store.getOpened());
const currentId = $derived(store.getCurrentId());
const currentDoc = $derived(store.getCurrentDoc());
const error = $derived(store.getError());
const loading = $derived(store.isLoading());
const isLive = $derived(store.isCurrentLive());

const LIVE_POLL_MS = 1500;

function copyUri(uri: string) {
	void navigator.clipboard?.writeText(uri).catch(() => {});
}

// Poll the active execution while it's running and we have a live
// file handle. Stops automatically when the doc transitions out of
// `running` or the page unmounts.
$effect(() => {
	if (!isLive) return;
	const handle = window.setInterval(() => {
		void store.refreshCurrent();
	}, LIVE_POLL_MS);
	return () => window.clearInterval(handle);
});
</script>

<div
  data-testid={testid}
  class="grid h-full min-h-0 grid-cols-[320px_1fr] overflow-hidden"
>
  <ExecutionList
    entries={entries}
    selectedId={currentId}
    loading={loading}
    onOpen={() => void store.openFromDevice()}
    onSelect={(id) => store.selectExecution(id)}
    onClose={(id) => store.closeExecution(id)}
    testid={tid('list')}
  />

  {#if error}
    <div
      data-testid={tid('error')}
      class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <Activity class="size-9 text-red-600/70 dark:text-red-300/70" />
      <div class="text-sm font-medium text-red-600 dark:text-red-300">
        Couldn't open this trace
      </div>
      <p class="max-w-[420px] text-[12.5px] leading-relaxed text-muted-foreground">
        {error}
      </p>
      <Button variant="outline" onclick={() => store.clearError()} data-testid={tid('error-dismiss')}>
        Dismiss
      </Button>
    </div>
  {:else if !currentDoc && entries.length === 0}
    <div
      data-testid={tid('landing')}
      class="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <div class="grid size-12 place-items-center rounded-xl border border-dashed border-border/60">
        <FileUp class="size-5 text-muted-foreground" />
      </div>
      <div class="font-semibold">Open a trace to view its execution</div>
      <p class="max-w-[420px] text-[12.5px] leading-relaxed text-muted-foreground">
        Pick a trace JSON file written by the runtime (e.g. the file behind a
        <code class="font-mono">file://</code> execution URI). The trace stays in this list for
        the rest of the tab session.
      </p>
      <Button onclick={() => void store.openFromDevice()} data-testid={tid('landing-open')}>
        <FileUp /> Open trace file
      </Button>
    </div>
  {:else}
    <ExecutionDetail
      doc={currentDoc}
      isLive={isLive}
      onCopyUri={copyUri}
      testid={tid('detail')}
    />
  {/if}
</div>
