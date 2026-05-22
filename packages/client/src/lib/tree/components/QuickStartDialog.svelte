<script lang="ts">
import ArrowRight from "@lucide/svelte/icons/arrow-right";
import Sparkles from "@lucide/svelte/icons/sparkles";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { cn, errorMessage, makeTid } from "$lib/utils";
import * as ws from "$lib/workspace/store.svelte";
import {
	type ExampleAccent,
	exampleNodeCount,
	exampleShape,
	QUICK_START_EXAMPLES,
	type QuickStartExample,
} from "../quickstart-examples";

interface Props {
	open: boolean;
	onClose: () => void;
	onCreated: (id: string) => void;
	testid?: string;
}
let { open = $bindable(), onClose, onCreated, testid }: Props = $props();
const tid = $derived(makeTid(testid));

let selectedIndex = $state(0);
let treeId = $state(QUICK_START_EXAMPLES[0]!.id);
let error = $state("");

const selected = $derived<QuickStartExample>(
	QUICK_START_EXAMPLES[selectedIndex]!,
);
const shape = $derived(exampleShape(selected.node));
const nodeCount = $derived(exampleNodeCount(selected));

$effect(() => {
	if (open) {
		selectedIndex = 0;
		treeId = QUICK_START_EXAMPLES[0]!.id;
		error = "";
	}
});

function select(i: number) {
	selectedIndex = i;
	treeId = QUICK_START_EXAMPLES[i]!.id;
	error = "";
}

function submit() {
	const id = treeId.trim();
	if (!id) return;
	try {
		// Auto-create a workspace if none is open yet — quick start should
		// be a one-click moment from the empty state.
		if (!ws.isOpen()) ws.newWorkspace(`${id}-workspace`);
		ws.createTree(id, selected.node);
		open = false;
		onCreated(id);
	} catch (err) {
		error = errorMessage(err);
	}
}

// Accent palette. Kept local — these aren't tokens in the design system,
// they're an editorial flourish unique to this surface.
const ACCENTS: Record<
	ExampleAccent,
	{ dot: string; stripe: string; halo: string; chip: string; text: string }
> = {
	amber: {
		dot: "bg-amber-400",
		stripe: "from-amber-400/70",
		halo: "from-amber-500/20",
		chip: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
		text: "text-amber-300",
	},
	emerald: {
		dot: "bg-emerald-400",
		stripe: "from-emerald-400/70",
		halo: "from-emerald-500/20",
		chip: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
		text: "text-emerald-300",
	},
	sky: {
		dot: "bg-sky-400",
		stripe: "from-sky-400/70",
		halo: "from-sky-500/20",
		chip: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
		text: "text-sky-300",
	},
	rose: {
		dot: "bg-rose-400",
		stripe: "from-rose-400/70",
		halo: "from-rose-500/20",
		chip: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
		text: "text-rose-300",
	},
	violet: {
		dot: "bg-violet-400",
		stripe: "from-violet-400/70",
		halo: "from-violet-500/20",
		chip: "bg-violet-400/10 text-violet-300 ring-violet-400/30",
		text: "text-violet-300",
	},
};

const KIND_GLYPH: Record<string, string> = {
	sequence: "→",
	selector: "?",
	parallel: "∥",
	action: "▸",
	ref: "↪",
};
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="overflow-hidden p-0 sm:max-w-[920px]"
    data-testid={tid?.('dialog')}
  >
    <!-- Edge halo: a soft gradient bound to the selected accent, giving the
         dialog an editorial 'spotlight' feel that shifts as you browse. -->
    <div
      aria-hidden="true"
      class={cn(
        'pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent opacity-70 transition-colors duration-500',
        ACCENTS[selected.accent].halo,
      )}
    ></div>

    <div class="relative grid grid-cols-[260px_1fr]">
      <!-- ============================== Left: index ============================== -->
      <aside
        class="border-r border-border/60 bg-background/40 backdrop-blur-sm"
        data-testid={tid?.('list')}
      >
        <header class="px-5 pb-3 pt-5">
          <div class="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles class="size-3 text-primary" />
            Quick start
          </div>
          <p class="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Curated trees that drop straight into your workspace.
          </p>
        </header>

        <ol class="flex flex-col gap-px px-2 pb-4">
          {#each QUICK_START_EXAMPLES as ex, i (ex.id)}
            {@const accent = ACCENTS[ex.accent]}
            {@const active = i === selectedIndex}
            <li>
              <button
                type="button"
                onclick={() => select(i)}
                data-testid={tid?.(`item-${ex.id}`)}
                aria-current={active ? 'true' : undefined}
                class={cn(
                  'group relative flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                  active ? 'bg-muted/60' : 'hover:bg-muted/30',
                )}
              >
                <!-- left accent stripe, only visible on hover/active -->
                <span
                  aria-hidden="true"
                  class={cn(
                    'absolute inset-y-2 left-0 w-px bg-gradient-to-b to-transparent transition-opacity',
                    accent.stripe,
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                  )}
                ></span>

                <span
                  aria-hidden="true"
                  class={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm font-mono text-[13px] leading-none ring-1 transition-colors',
                    active
                      ? `${accent.chip}`
                      : 'bg-muted/40 text-muted-foreground ring-border/60 group-hover:text-foreground',
                  )}
                >{ex.glyph}</span>

                <span class="min-w-0 flex-1">
                  <span
                    class={cn(
                      'block truncate text-[13px] font-medium tracking-tight transition-colors',
                      active ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground',
                    )}
                  >{ex.title}</span>
                  <span class="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {ex.tagline}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  class={cn(
                    'mt-1 size-1.5 shrink-0 rounded-full transition-opacity',
                    accent.dot,
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                ></span>
              </button>
            </li>
          {/each}
        </ol>
      </aside>

      <!-- ============================== Right: detail ============================== -->
      <section class="relative flex min-h-[460px] flex-col" data-testid={tid?.('detail')}>
        <div class="flex-1 px-8 pb-2 pt-7">
          <!-- eyebrow -->
          <div class="flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span class={cn('font-mono tabular-nums', ACCENTS[selected.accent].text)}>
              {String(selectedIndex + 1).padStart(2, '0')} / {String(QUICK_START_EXAMPLES.length).padStart(2, '0')}
            </span>
            <span class="h-px flex-1 bg-border/60"></span>
            <span>Template</span>
          </div>

          <!-- title block -->
          <div class="mt-4">
            <h2
              class="text-[26px] font-semibold leading-[1.1] tracking-tight"
              data-testid={tid?.('title')}
            >{selected.title}</h2>
            <p class="mt-2 max-w-[460px] text-[13px] italic leading-relaxed text-muted-foreground">
              {selected.tagline}
            </p>
          </div>

          <!-- summary + meta -->
          <div class="mt-6 grid grid-cols-[1fr_auto] items-start gap-6">
            <p class="max-w-[500px] text-[12.5px] leading-relaxed text-foreground/85">
              {selected.summary}
            </p>
            <div class="flex flex-col gap-2 text-right">
              <span class={cn(
                'rounded-full px-2.5 py-1 text-[10.5px] font-mono uppercase tracking-wider ring-1',
                ACCENTS[selected.accent].chip,
              )}>
                {nodeCount} node{nodeCount === 1 ? '' : 's'}
              </span>
              <span class="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                v{selected.version}
              </span>
            </div>
          </div>

          <!-- shape preview -->
          <div class="mt-7">
            <div class="mb-2 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>Shape</span>
              <span class="h-px flex-1 bg-border/60"></span>
            </div>
            <pre
              class="overflow-x-auto rounded-md border border-border/60 bg-background/60 px-4 py-3 font-mono text-[12px] leading-[1.7]"
              data-testid={tid?.('shape')}
            >{#each shape as row, i (i)}<span class="flex"
              ><span class="select-none text-muted-foreground/50"
                >{#if row.indent === 0}{''}{:else}{'  '.repeat(row.indent - 1)}{row.isLast ? '└─ ' : '├─ '}{/if}</span
              ><span class={cn('mr-2 select-none', row.kind === 'action' ? 'text-foreground/60' : ACCENTS[selected.accent].text)}
                >{KIND_GLYPH[row.kind]}</span
              ><span class="text-foreground/90">{row.label}</span
              ><span class="ml-2 text-muted-foreground/60">{row.kind}</span></span
            >{/each}</pre>
          </div>
        </div>

        <!-- footer / form -->
        <form
          class="grid grid-cols-[1fr_auto] items-end gap-4 border-t border-border/60 bg-muted/20 px-8 py-4"
          onsubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div class="flex flex-col gap-1.5">
            <Label for="qs-tree-id" class="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              Tree id
            </Label>
            <Input
              id="qs-tree-id"
              bind:value={treeId}
              data-testid={tid?.('id')}
              class="h-9 font-mono"
            />
            {#if error}
              <p class="text-xs text-destructive" data-testid={tid?.('error')}>{error}</p>
            {:else}
              <p class="text-[11px] text-muted-foreground">
                Lands in your workspace as <span class="font-mono text-foreground/80">{treeId || '—'}</span>.
              </p>
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onclick={onClose}
              data-testid={tid?.('cancel')}
            >Cancel</Button>
            <Button
              type="submit"
              disabled={!treeId.trim()}
              data-testid={tid?.('submit')}
            >
              Use this template
              <ArrowRight class="size-3.5" />
            </Button>
          </div>
        </form>
      </section>
    </div>

    <Dialog.Title class="sr-only">Quick start templates</Dialog.Title>
    <Dialog.Description class="sr-only">
      Pick a curated behaviour tree to drop into your workspace.
    </Dialog.Description>
  </Dialog.Content>
</Dialog.Root>
