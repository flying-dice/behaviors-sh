<script lang="ts">
  import { makeTid } from '$lib/utils';
  import { kindOf, type ValueKind } from '../scope';

  interface Props {
    value: unknown;
    testid?: string;
  }
  let { value, testid }: Props = $props();

  const tid = $derived(makeTid(testid));
  const kind: ValueKind = $derived(kindOf(value));

  const stringValue = $derived(kind === 'string' ? (value as string) : '');
  const objectJson = $derived(
    kind === 'array' || kind === 'object'
      ? JSON.stringify(value, null, 2)
      : '',
  );
</script>

<div data-testid={testid} class="min-w-0 text-[12px]">
  {#if kind === 'null'}
    <span
      class="font-mono text-[11.5px] italic text-muted-foreground/80"
      data-testid={tid('null')}
    >
      — not set
    </span>
  {:else if kind === 'boolean'}
    <span
      class={[
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider',
        value
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
          : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300',
      ].join(' ')}
      data-testid={tid('bool')}
    >
      {value ? 'true' : 'false'}
    </span>
  {:else if kind === 'number'}
    <code
      class="font-mono text-[12.5px] tabular-nums text-foreground"
      data-testid={tid('number')}
    >
      {value as number}
    </code>
  {:else if kind === 'string'}
    <p
      class="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/90"
      data-testid={tid('string')}
    >
      <span class="text-muted-foreground">“</span>{stringValue}<span class="text-muted-foreground">”</span>
    </p>
  {:else}
    <pre
      class="overflow-x-auto rounded border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed"
      data-testid={tid('json')}>{objectJson}</pre>
  {/if}
</div>
