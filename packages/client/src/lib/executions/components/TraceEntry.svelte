<script lang="ts">
import type { TraceEntry } from "@behaviors-sh/spec";
import Brain from "@lucide/svelte/icons/brain";
import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
import ChevronRight from "@lucide/svelte/icons/chevron-right";
import Loader2 from "@lucide/svelte/icons/loader-2";
import ShieldCheck from "@lucide/svelte/icons/shield-check";
import Sparkles from "@lucide/svelte/icons/sparkles";
import XCircle from "@lucide/svelte/icons/x-circle";
import * as Tooltip from "$lib/components/ui/tooltip";
import { makeTid } from "$lib/utils";
import { formatExactTime, formatRelativeTime } from "../format";
import TextWithRefs from "./TextWithRefs.svelte";

interface Props {
	entry: TraceEntry;
	index: number;
	isLatest: boolean;
	isLive: boolean;
	// The original instruction (for `instruct` entries) or evaluate
	// expression (for `evaluate` entries) the agent was responding to.
	// Looked up from the embedded tree by the parent.
	prompt?: string;
	// Live scopes from the execution doc. Threaded down so inline
	// `$VAR.X` / `$CONST.Y` references in the prompt / submitted /
	// note text can be swapped for hoverable badges.
	varScope: Record<string, unknown>;
	constScope: Record<string, unknown>;
	testid?: string;
}
let {
	entry,
	index,
	isLatest,
	isLive,
	prompt,
	varScope,
	constScope,
	testid,
}: Props = $props();

const tid = $derived(makeTid(testid));

// Classify the entry's outcome into a small visual vocabulary. We
// map every lifecycle word the runtime emits to one of these so the
// card can lead with a single status icon.
type IconKind = "success" | "failure" | "live" | "protocol" | "think";
const iconKind = $derived<IconKind>(
	isLatest && isLive
		? "live"
		: entry.kind === "protocol"
			? "protocol"
			: entry.kind === "think"
				? "think"
				: isFailureOutcome(entry.outcome)
					? "failure"
					: "success",
);

function isFailureOutcome(outcome: string): boolean {
	const o = outcome.toLowerCase();
	return (
		o === "failure" ||
		o === "failed" ||
		o === "action_failed" ||
		o === "evaluation_failed" ||
		o === "protocol_rejected"
	);
}

// The status-coloured palette is small and intentional — every entry
// pulls its left edge, icon color, and faint background tint from the
// same row.
const PALETTE: Record<
	IconKind,
	{ ring: string; bar: string; tint: string; iconClass: string }
> = {
	success: {
		ring: "ring-emerald-500/30",
		bar: "bg-emerald-500",
		tint: "bg-emerald-500/[0.04]",
		iconClass: "text-emerald-500",
	},
	failure: {
		ring: "ring-red-500/30",
		bar: "bg-red-500",
		tint: "bg-red-500/[0.04]",
		iconClass: "text-red-500",
	},
	live: {
		ring: "ring-amber-500/30",
		bar: "bg-amber-500",
		tint: "bg-amber-500/[0.05]",
		iconClass: "text-amber-500",
	},
	protocol: {
		ring: "ring-blue-500/30",
		bar: "bg-blue-500",
		tint: "bg-blue-500/[0.04]",
		iconClass: "text-blue-500",
	},
	think: {
		ring: "ring-border",
		bar: "bg-muted-foreground/40",
		tint: "bg-muted/30",
		iconClass: "text-muted-foreground",
	},
};
const palette = $derived(PALETTE[iconKind]);

// Human-readable label for the outcome — shown on hover of the icon.
// Translates the runtime lifecycle vocabulary into something a
// non-developer can interpret without reading source.
const OUTCOME_LABEL: Record<string, string> = {
	action_complete: "Action complete",
	step_complete: "Step complete",
	action_failed: "Action failed",
	evaluation_passed: "Condition true",
	evaluation_failed: "Condition false",
	protocol_accepted: "Protocol accepted",
	protocol_rejected: "Protocol rejected",
	recorded: "Thought recorded",
	running: "Still running",
	success: "Success",
	failure: "Failure",
};
const outcomeLabel = $derived(OUTCOME_LABEL[entry.outcome] ?? entry.outcome);

// For evaluate entries the agent's `submitted` is just "true" / "false";
// we represent that with a dedicated chip in the header to free up
// the body for the actual reasoning. For everything else the
// `submitted` text is the agent's narration of what it did.
const isEvalEntry = $derived(entry.kind === "evaluate");
const evalAnswer = $derived(
	isEvalEntry
		? entry.submitted.trim().toLowerCase() === "true"
			? "true"
			: "false"
		: null,
);

// Think entries store the thought in `note`, not `submitted`.
const thoughtBody = $derived(entry.kind === "think" ? entry.note : null);

const hasNote = $derived(entry.kind !== "think" && !!entry.note);
</script>

<article
  data-testid={testid}
  class={[
    'group relative overflow-hidden rounded-lg border bg-card/40 transition-colors hover:bg-card/70',
    palette.tint,
  ].join(' ')}
>
  <!-- Status-coloured left edge. The single piece of chrome that
       carries kind + outcome at a glance. -->
  <span
    class={['absolute inset-y-0 left-0 w-[3px]', palette.bar].join(' ')}
    aria-hidden="true"
  ></span>

  <div class="grid gap-2 px-4 py-3 pl-5">
    <!-- Header: status icon + node name + optional eval chip + time -->
    <header class="flex items-center gap-2.5">
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <span
                {...props}
                class={[
                  'inline-grid size-5 shrink-0 place-items-center rounded-full bg-background ring-1',
                  palette.ring,
                  palette.iconClass,
                ].join(' ')}
                data-testid={tid('icon')}
                aria-label={outcomeLabel}
              >
                {#if iconKind === 'success'}
                  <CheckCircle2 class="size-4" />
                {:else if iconKind === 'failure'}
                  <XCircle class="size-4" />
                {:else if iconKind === 'live'}
                  <Loader2 class="size-3.5 animate-spin" />
                {:else if iconKind === 'protocol'}
                  <ShieldCheck class="size-3.5" />
                {:else}
                  <Brain class="size-3.5" />
                {/if}
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{outcomeLabel}</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      <h3
        class="min-w-0 flex-1 truncate font-mono text-[12.5px] font-semibold text-foreground"
        data-testid={tid('name')}
      >
        {entry.name}
        {#if entry.kind !== 'instruct'}
          <span class="ml-1 font-normal text-muted-foreground">
            · {entry.kind}
          </span>
        {/if}
      </h3>

      {#if evalAnswer}
        <span
          class={[
            'shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
            evalAnswer === 'true'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300',
          ].join(' ')}
          data-testid={tid('eval-answer')}
        >
          {evalAnswer}
        </span>
      {/if}

      <time
        class="shrink-0 font-mono text-[10.5px] text-muted-foreground"
        title={formatExactTime(entry.ts)}
        data-testid={tid('ts')}
      >
        {formatRelativeTime(entry.ts)}
      </time>
    </header>

    <!-- Prompt: the instruction quote or the evaluate expression. The
         single highest-signal block; rendered prominently. Inline
         `$VAR.X` / `$CONST.Y` references become hoverable badges. -->
    {#if prompt && entry.kind === 'instruct'}
      <blockquote
        class="border-l-2 border-foreground/15 pl-3 text-[12.5px] leading-relaxed text-foreground/85"
        data-testid={tid('prompt')}
      >
        <TextWithRefs text={prompt} {varScope} {constScope} />
      </blockquote>
    {:else if prompt && entry.kind === 'evaluate'}
      <code
        class="block rounded border bg-muted/40 px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-foreground/90"
        data-testid={tid('prompt')}
      >
        <TextWithRefs text={prompt} {varScope} {constScope} />
      </code>
    {/if}

    <!-- Body: the agent's narration (or thought for think entries).
         Eval entries skip this because their "submitted" is just
         true/false, already shown as the chip in the header. -->
    {#if thoughtBody}
      <p
        class="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/85"
        data-testid={tid('thought')}
      >
        <TextWithRefs text={thoughtBody} {varScope} {constScope} />
      </p>
    {:else if !isEvalEntry && entry.submitted}
      <div class="grid gap-1">
        <div class="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <ChevronRight class="size-3" />
          Agent
        </div>
        <p
          class="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/90"
          data-testid={tid('submitted')}
        >
          <TextWithRefs text={entry.submitted} {varScope} {constScope} />
        </p>
      </div>
    {/if}

    <!-- Reasoning: the optional note. For non-think entries, this is
         the agent's "why". Shown only when present. -->
    {#if hasNote}
      <div class="grid gap-1">
        <div class="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles class="size-3" />
          Reasoning
        </div>
        <p
          class="whitespace-pre-wrap break-words text-[11.5px] italic leading-relaxed text-muted-foreground"
          data-testid={tid('note')}
        >
          <TextWithRefs text={entry.note ?? ''} {varScope} {constScope} />
        </p>
      </div>
    {/if}

  </div>
</article>
