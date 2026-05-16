<script lang="ts">
  import { makeTid } from "$lib/utils";
  interface Props {
    yaml: string;
    testid?: string;
  }
  let { yaml, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  type Token = { text: string; color?: string };

  function tokenizeValue(raw: string): Token[] {
    if (!raw) return [];
    if (/^("|').*\1$/.test(raw)) return [{ text: raw, color: 'var(--color-abtree-yellow)' }];
    if (/^-?\d+(\.\d+)?$/.test(raw)) return [{ text: raw, color: 'var(--color-abtree-purple)' }];
    if (raw === 'true' || raw === 'false' || raw === 'null')
      return [{ text: raw, color: 'var(--color-abtree-orange)' }];
    if (raw === '|' || raw === '>') return [{ text: raw, color: 'var(--color-abtree-cyan)' }];
    if (/^\[.*\]$|^\{.*\}$/.test(raw))
      return [{ text: raw, color: 'var(--color-abtree-cyan)' }];
    return [{ text: raw }];
  }

  function tokenizeLine(line: string): Token[] {
    if (line.startsWith('#')) return [{ text: line, color: 'hsl(var(--muted-foreground))' }];
    const m = line.match(/^(\s*)(-\s+)?([A-Za-z_][\w$.-]*)(\s*:\s*)(.*)$/);
    if (m) {
      const [, ws, dash, key, sep, val] = m;
      return [
        { text: ws },
        ...(dash ? [{ text: dash, color: 'var(--color-abtree-purple)' }] : []),
        { text: key, color: 'hsl(var(--primary))' },
        { text: sep },
        ...tokenizeValue(val),
      ];
    }
    const m2 = line.match(/^(\s*-\s+)(.*)$/);
    if (m2) return [{ text: m2[1], color: 'var(--color-abtree-purple)' }, { text: m2[2] }];
    return [{ text: line }];
  }

  const lines = $derived(yaml.split('\n'));
</script>

<div class="relative" data-testid={testid}>
  <span
    class="pointer-events-none absolute right-3 top-2 font-mono text-[10px] font-medium uppercase tracking-widest text-primary"
  >
    YAML
  </span>
  <pre
    data-testid={tid('code')}
    class="m-0 overflow-auto rounded-md border bg-background px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-foreground whitespace-pre">
{#each lines as line, i (i)}<div>{#each tokenizeLine(line) as tk}<span style={tk.color ? `color: ${tk.color}` : ''}>{tk.text}</span>{/each}</div>{/each}
  </pre>
</div>
<p class="mt-2.5 font-mono text-xs text-muted-foreground">
  Generated live · saved on every change · validated against tree schema
</p>
