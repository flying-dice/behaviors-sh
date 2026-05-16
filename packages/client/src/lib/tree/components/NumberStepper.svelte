<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import XIcon from '@lucide/svelte/icons/x';

  interface Props {
    /** Current value as a string. Empty string means "unset" / placeholder. */
    value: string;
    /** Inclusive minimum. Step buttons clamp here; typing is left to the parent. */
    min?: number;
    /** Inclusive maximum, or `Infinity`. */
    max?: number;
    step?: number;
    placeholder?: string;
    id?: string;
    /**
     * Root `data-testid`. Sub-elements get suffixed testids
     * (`<testid>-dec`, `<testid>-input`, `<testid>-inc`) so tests can target
     * the buttons and the field independently.
     */
    testid?: string;
    onChange: (next: string) => void;
  }

  let {
    value,
    min = 1,
    max = Number.POSITIVE_INFINITY,
    step = 1,
    placeholder = '—',
    id,
    testid,
    onChange,
  }: Props = $props();

  const parsed = $derived.by(() => {
    const t = value.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  });
  const canDec = $derived(parsed != null && parsed > min);
  const canInc = $derived(parsed == null || parsed < max);
  const hasValue = $derived(value.trim().length > 0);

  function bump(direction: -1 | 1) {
    const base = parsed ?? min - direction;
    const next = base + direction * step;
    if (next < min || next > max) return;
    onChange(String(next));
  }
</script>

<div
  data-testid={testid}
  class="border-input bg-input/20 dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/30 inline-flex h-7 w-full items-stretch overflow-hidden rounded-md border focus-within:ring-2"
>
  <button
    type="button"
    aria-label="Decrease"
    disabled={!canDec}
    onclick={() => bump(-1)}
    data-testid={testid ? `${testid}-dec` : undefined}
    class="grid w-7 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
  >
    <Minus class="size-3.5" />
  </button>
  <div class="relative flex min-w-0 flex-1 items-stretch border-x">
    <input
      {id}
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      {value}
      {placeholder}
      oninput={(e) => onChange(e.currentTarget.value)}
      data-testid={testid ? `${testid}-input` : undefined}
      class="min-w-0 flex-1 bg-transparent px-2 pr-6 text-center text-xs/relaxed text-foreground outline-none placeholder:text-muted-foreground"
    />
    {#if hasValue}
      <button
        type="button"
        aria-label="Clear"
        onclick={() => onChange('')}
        data-testid={testid ? `${testid}-clear` : undefined}
        class="absolute inset-y-0 right-0 grid w-5 place-items-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon class="size-3" />
      </button>
    {/if}
  </div>
  <button
    type="button"
    aria-label="Increase"
    disabled={!canInc}
    onclick={() => bump(1)}
    data-testid={testid ? `${testid}-inc` : undefined}
    class="grid w-7 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
  >
    <Plus class="size-3.5" />
  </button>
</div>
