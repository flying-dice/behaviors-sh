<script lang="ts">
import type { ExecutionDocument } from "@behaviors-sh/spec";
import Activity from "@lucide/svelte/icons/activity";
import Clock from "@lucide/svelte/icons/clock";
import Copy from "@lucide/svelte/icons/copy";
import GitBranch from "@lucide/svelte/icons/git-branch";
import Radio from "@lucide/svelte/icons/radio";
import { untrack } from "svelte";
import { Badge } from "$lib/components/ui/badge";
import type { Path } from "$lib/tree/tree-ops";
import { makeTid } from "$lib/utils";
import { inFlightPath as resolveInFlight } from "../cursor";
import {
	classifyStatus,
	formatExactTime,
	formatRelativeTime,
	shortenUri,
} from "../format";
import ExecutionCanvas from "./ExecutionCanvas.svelte";
import ExecutionCanvasOverlay from "./ExecutionCanvasOverlay.svelte";
import ExecutionInspectorPane from "./ExecutionInspectorPane.svelte";
import StatusPill from "./StatusPill.svelte";

interface Props {
	doc: ExecutionDocument | null;
	isLive: boolean;
	onCopyUri: (uri: string) => void;
	testid?: string;
}
let { doc, isLive, onCopyUri, testid }: Props = $props();

const tid = $derived(makeTid(testid));

// Local view state — reset whenever the open execution changes so
// pan/zoom/selection/inspector-open don't leak between traces.
let selected = $state<Path | null>(null);
let pan = $state({ x: 0, y: 0 });
let zoom = $state(1);
let inspectorOpen = $state(true);
let inspectorWidth = $state(400);
let fitToken = $state(0);
let prevUri = $state<string | null>(null);

// Resize drag — track the original pointer X + width so deltas are
// computed off the drag start (not the previous frame). Width is
// clamped to keep the inspector usable and the canvas non-trivial.
const INSPECTOR_MIN = 280;
const INSPECTOR_MAX = 720;
let dragStart = $state<{ x: number; w: number } | null>(null);
const dragging = $derived(dragStart !== null);

$effect(() => {
	const uri = doc?.uri ?? null;
	// Use `untrack` on the bookkeeping write so this effect doesn't
	// re-subscribe to `prevUri` and double-fire — only `doc.uri`
	// should be the dependency.
	untrack(() => {
		if (uri !== prevUri) {
			selected = null;
			pan = { x: 0, y: 0 };
			zoom = 1;
			inspectorOpen = true;
			fitToken++;
			prevUri = uri;
		}
	});
});

// After the toolbar toggle expands the inspector back open we want
// a fresh fit, otherwise the canvas keeps the zoom it had at the
// wider viewport and the tree looks off-centre. `untrack` keeps the
// bookkeeping write out of the effect's dependency set so it fires
// exactly once per toggle.
let prevInspectorOpen = $state(true);
$effect(() => {
	const open = inspectorOpen;
	untrack(() => {
		if (open !== prevInspectorOpen) {
			fitToken++;
			prevInspectorOpen = open;
		}
	});
});

function onHandleMouseDown(e: MouseEvent) {
	if (!inspectorOpen) return;
	e.preventDefault();
	dragStart = { x: e.clientX, w: inspectorWidth };
}

function onWindowMouseMove(e: MouseEvent) {
	if (!dragStart) return;
	// Dragging left grows the inspector; rightward shrinks it.
	const delta = dragStart.x - e.clientX;
	inspectorWidth = Math.max(
		INSPECTOR_MIN,
		Math.min(INSPECTOR_MAX, dragStart.w + delta),
	);
}

function onWindowMouseUp() {
	if (!dragStart) return;
	dragStart = null;
	// Refit after the resize so the tree re-centres into the new
	// canvas viewport.
	fitToken++;
}

const inFlight = $derived(doc ? resolveInFlight(doc) : null);

const showLiveBadge = $derived(
	!!doc && classifyStatus(doc.status) === "running",
);
</script>

<svelte:window onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} />

<section
  data-testid={testid}
  class="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden"
>
  {#if !doc}
    <div></div>
    <div
      class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground"
      data-testid={tid('empty')}
    >
      <Activity class="size-10 opacity-40" />
      <div class="font-medium text-foreground">No trace selected</div>
      <p class="max-w-[360px] leading-relaxed">
        Open a trace JSON file from disk to view its execution canvas. Traces
        you've opened before are listed on the left.
      </p>
    </div>
  {:else}
    <!-- Slim, single-row header. Everything secondary lives in the
         inspector tabs; the bar is just identity + status. -->
    <header class="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b bg-background/60 px-5 py-2.5">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <h1
          class="truncate font-mono text-[13.5px] font-semibold tracking-tight"
          title={doc.uri}
          data-testid={tid('title')}
        >
          {shortenUri(doc.uri)}
        </h1>
        <button
          type="button"
          onclick={() => onCopyUri(doc.uri)}
          aria-label="Copy URI"
          data-testid={tid('copy-uri')}
          class="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Copy class="size-3" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]">
        <span class="flex items-center gap-1 text-muted-foreground">
          <GitBranch class="size-3" />
          <span class="font-mono text-foreground" data-testid={tid('tree-name')}>
            {doc.tree.type === 'ref' ? '(ref)' : doc.tree.name}
          </span>
        </span>
        <span class="flex items-center gap-1 text-muted-foreground">
          <span class="text-[9.5px] uppercase tracking-wider">phase</span>
          <span class="font-mono text-foreground" data-testid={tid('phase')}>
            {doc.phase}
          </span>
        </span>
        <span class="flex items-center gap-1 text-muted-foreground">
          <Clock class="size-3" />
          <span
            class="font-mono text-foreground"
            title={formatExactTime(doc.updated_at)}
            data-testid={tid('updated')}
          >
            {formatRelativeTime(doc.updated_at)}
          </span>
        </span>
        {#if showLiveBadge && isLive}
          <Badge
            variant="secondary"
            class="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            data-testid={tid('live-badge')}
          >
            <Radio class="mr-1 size-3 animate-pulse" /> Live
          </Badge>
        {/if}
        <StatusPill status={doc.status} testid={tid('status')} />
      </div>
    </header>

    <!-- Body: canvas on the left, optional handle column, then the
         inspector. The handle gets its own 8px grid track so the
         hover/drag highlight covers a generous ribbon (matching the
         tree designer) instead of a hairline. The width transition is
         disabled during an active drag so the column tracks the
         pointer 1:1. -->
    <div
      class={[
        'relative grid h-full min-h-0 overflow-hidden',
        dragging ? '' : 'transition-[grid-template-columns] duration-200',
      ].join(' ')}
      style:grid-template-columns={
        inspectorOpen
          ? `1fr 8px ${inspectorWidth}px`
          : '1fr 0px 0px'
      }
      style:cursor={dragging ? 'ew-resize' : 'default'}
    >
      <div class="relative h-full min-h-0">
        <ExecutionCanvas
          root={doc.tree}
          selected={selected}
          pan={pan}
          zoom={zoom}
          statusByPath={doc.runtime.node_status}
          inFlightPath={inFlight}
          fitToken={fitToken}
          onSelect={(p) => (selected = p)}
          onPan={(p) => (pan = p)}
          onZoom={(z) => (zoom = z)}
          testid={tid('canvas')}
        />
        <ExecutionCanvasOverlay
          zoom={zoom}
          inspectorOpen={inspectorOpen}
          onZoom={(z) => (zoom = z)}
          onFit={() => fitToken++}
          onToggleInspector={() => (inspectorOpen = !inspectorOpen)}
          testid={tid('overlay')}
        />
      </div>

      {#if inspectorOpen}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector"
          onmousedown={onHandleMouseDown}
          data-testid={tid('resize-handle')}
          class={[
            'cursor-col-resize transition-colors hover:bg-primary/40',
            dragging ? 'bg-primary/40' : '',
          ].join(' ')}
        ></div>
      {/if}

      <div class="min-h-0 overflow-hidden">
        {#if inspectorOpen}
          <ExecutionInspectorPane
            doc={doc}
            selected={selected}
            inFlightPath={inFlight}
            testid={tid('inspector')}
          />
        {/if}
      </div>
    </div>
  {/if}
</section>
