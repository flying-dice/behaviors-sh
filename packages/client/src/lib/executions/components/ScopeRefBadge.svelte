<script lang="ts">
  import { makeTid } from '$lib/utils';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { kindOf, splitNamespacedKey, type ScopeRef } from '../scope';

  interface Props {
    ref: ScopeRef;
    exists: boolean;
    value: unknown;
    testid?: string;
  }
  let { ref, exists, value, testid }: Props = $props();

  const tid = $derived(makeTid(testid));
  const split = $derived(splitNamespacedKey(ref.key));
  const valueKind = $derived(kindOf(value));

  // Short, single-line preview used inside the tooltip. Long strings
  // and JSON-y values are truncated; tooltips aren't the place for
  // wholesale value inspection (that's the State tab).
  const valuePreview = $derived.by<string>(() => {
    if (!exists) return 'no such key';
    if (valueKind === 'null') return '— not set';
    if (valueKind === 'boolean') return String(value);
    if (valueKind === 'number') return String(value);
    if (valueKind === 'string') {
      const s = value as string;
      return s.length > 220 ? `${s.slice(0, 220)}…` : s;
    }
    const json = JSON.stringify(value);
    return json.length > 220 ? `${json.slice(0, 220)}…` : json;
  });

  // Scope colors mirror the spec colour layer used elsewhere (var =
  // active/foreground, const = locked/muted). Kept subtle so the badge
  // reads as inline punctuation rather than a CTA.
  const scopeClasses = $derived(
    ref.scope === 'var'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15'
      : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15',
  );
</script>

<Tooltip.Provider delayDuration={150}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <span
          {...props}
          data-testid={testid}
          class={[
            'mx-px inline-flex max-w-full items-baseline gap-0.5 truncate rounded-sm border px-1 py-px font-mono text-[10.5px] leading-snug align-baseline transition-colors',
            scopeClasses,
          ].join(' ')}
        >
          <span class="text-[9.5px] uppercase tracking-wider opacity-70">
            ${ref.scope === 'var' ? 'var' : 'const'}
          </span>
          <span class="font-semibold">{split.local}</span>
        </span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="top" class="max-w-[320px]">
      <div class="grid gap-1 font-mono text-[11px]" data-testid={tid('tooltip')}>
        <div class="flex items-baseline gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span class="font-semibold text-foreground">${ref.scope === 'var' ? 'VAR' : 'CONST'}</span>
          <span>·</span>
          <span class="normal-case tracking-normal text-foreground">{ref.key}</span>
        </div>
        <div
          class={[
            'whitespace-pre-wrap break-words text-[12px] leading-relaxed',
            !exists || valueKind === 'null'
              ? 'italic text-muted-foreground'
              : 'text-foreground',
          ].join(' ')}
          data-testid={tid('value')}
        >
          {valuePreview}
        </div>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
