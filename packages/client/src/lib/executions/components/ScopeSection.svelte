<script lang="ts">
import Lock from "@lucide/svelte/icons/lock";
import Variable from "@lucide/svelte/icons/variable";
import { makeTid } from "$lib/utils";
import { kindOf, splitNamespacedKey } from "../scope";
import ScopeValue from "./ScopeValue.svelte";

interface Props {
	title: string;
	sigil: "$VAR" | "$CONST";
	kind: "var" | "const";
	description: string;
	data: Record<string, unknown>;
	emptyMessage: string;
	testid?: string;
}
let { title, sigil, kind, description, data, emptyMessage, testid }: Props =
	$props();

const tid = $derived(makeTid(testid));

// Sort entries by namespace then local key for stable ordering.
const entries = $derived.by(() => {
	return Object.entries(data ?? {})
		.map(([key, value]) => ({
			key,
			value,
			split: splitNamespacedKey(key),
		}))
		.sort((a, b) => {
			const ns = (a.split.namespace ?? "").localeCompare(
				b.split.namespace ?? "",
			);
			if (ns !== 0) return ns;
			return a.split.local.localeCompare(b.split.local);
		});
});

const isEmpty = $derived(entries.length === 0);

// Per-row "is this slot populated?" dot. For $VAR this means a
// non-null value has been written; for $CONST it's always "set"
// (constants exist or they don't).
function isPopulated(value: unknown): boolean {
	return kindOf(value) !== "null";
}
</script>

<section data-testid={testid} class="grid gap-2">
  <header class="flex items-baseline justify-between">
    <div class="flex items-center gap-2">
      {#if kind === 'var'}
        <Variable class="size-3.5 text-foreground/70" />
      {:else}
        <Lock class="size-3.5 text-foreground/70" />
      {/if}
      <h3 class="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
        {title}
      </h3>
      <code class="font-mono text-[10px] text-muted-foreground/80">{sigil}</code>
    </div>
    <span class="font-mono text-[10.5px] text-muted-foreground" data-testid={tid('count')}>
      {entries.length}
      {entries.length === 1 ? 'slot' : 'slots'}
    </span>
  </header>

  <p class="text-[11px] leading-relaxed text-muted-foreground">
    {description}
  </p>

  {#if isEmpty}
    <div
      class="rounded-md border border-dashed bg-muted/10 px-3 py-4 text-center text-[11.5px] text-muted-foreground"
      data-testid={tid('empty')}
    >
      {emptyMessage}
    </div>
  {:else}
    <ul
      class="grid gap-0 overflow-hidden rounded-md border bg-background/50"
      data-testid={tid('list')}
    >
      {#each entries as item, i (item.key)}
        {@const populated = isPopulated(item.value)}
        <li
          class={[
            'grid gap-1 px-3 py-2.5',
            i > 0 ? 'border-t' : '',
            kind === 'const' ? 'bg-muted/[0.04]' : '',
          ].join(' ')}
          data-testid={tid(`slot-${item.key}`)}
        >
          <div class="flex items-baseline gap-2">
            <span
              class={[
                'mt-1 size-1.5 shrink-0 rounded-full',
                kind === 'const'
                  ? 'bg-foreground/40'
                  : populated
                    ? 'bg-emerald-500'
                    : 'border border-muted-foreground/40 bg-transparent',
              ].join(' ')}
              aria-hidden="true"
            ></span>
            <code
              class="min-w-0 break-all font-mono text-[12px] font-semibold text-foreground"
              data-testid={tid(`slot-${item.key}-key`)}
            >
              {item.split.local}
            </code>
            {#if item.split.namespace}
              <span
                class="shrink-0 font-mono text-[10px] text-muted-foreground/70"
                title={item.key}
              >
                in {item.split.namespace}
              </span>
            {/if}
          </div>
          <div class="pl-[14px]">
            <ScopeValue
              value={item.value}
              testid={tid(`slot-${item.key}-value`)}
            />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
