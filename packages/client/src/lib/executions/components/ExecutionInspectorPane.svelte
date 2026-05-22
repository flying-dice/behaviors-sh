<script lang="ts">
  import { makeTid } from '$lib/utils';
  import type { ExecutionDocument } from '@behaviors-ui/spec';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import * as Tabs from '$lib/components/ui/tabs';
  import Activity from '@lucide/svelte/icons/activity';
  import Database from '@lucide/svelte/icons/database';
  import Cpu from '@lucide/svelte/icons/cpu';
  import type { Path } from '$lib/tree/tree-ops';
  import NodeTraceInspector from './NodeTraceInspector.svelte';
  import ScopeSection from './ScopeSection.svelte';

  interface Props {
    doc: ExecutionDocument;
    selected: Path | null;
    inFlightPath: Path | null;
    testid?: string;
  }
  let { doc, selected, inFlightPath, testid }: Props = $props();

  const tid = $derived(makeTid(testid));

  let tab = $state<'activity' | 'state' | 'engine'>('activity');

  // Empty-state for the State tab when both scopes are empty (e.g.
  // tree has no `state` declarations).
  const stateEmpty = $derived(
    Object.keys(doc.var ?? {}).length === 0 &&
      Object.keys(doc.const ?? {}).length === 0,
  );

  function fmt(v: unknown): string {
    return JSON.stringify(v, null, 2);
  }
</script>

<aside
  data-testid={testid}
  class="flex h-full min-h-0 flex-col border-l bg-card/40"
>
  <Tabs.Root
    value={tab}
    onValueChange={(v) => (tab = v as typeof tab)}
    class="grid h-full min-h-0 grid-rows-[auto_1fr]"
  >
    <Tabs.List class="mx-3 mt-2 w-fit">
      <Tabs.Trigger value="activity" data-testid={tid('tab-activity')}>
        <Activity class="mr-1.5 size-3" />
        Activity
      </Tabs.Trigger>
      <Tabs.Trigger value="state" data-testid={tid('tab-state')}>
        <Database class="mr-1.5 size-3" />
        State
      </Tabs.Trigger>
      <Tabs.Trigger value="engine" data-testid={tid('tab-engine')}>
        <Cpu class="mr-1.5 size-3" />
        Engine
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="activity" class="min-h-0 overflow-hidden">
      <NodeTraceInspector
        doc={doc}
        selected={selected}
        inFlightPath={inFlightPath}
        testid={tid('node')}
      />
    </Tabs.Content>

    <Tabs.Content value="state" class="min-h-0 overflow-hidden">
      <ScrollArea class="h-full">
        <div class="grid gap-5 p-4" data-testid={tid('state')}>
          {#if stateEmpty}
            <div class="rounded-md border border-dashed bg-muted/20 px-3 py-6 text-center text-[11.5px] text-muted-foreground">
              No scope declared on this tree.
            </div>
          {:else}
            <ScopeSection
              title="Variables"
              sigil="$VAR"
              kind="var"
              description="Mutable slots written by actions during the run. A filled dot means a value has been recorded; an outline means the slot is declared but still null."
              data={doc.var ?? {}}
              emptyMessage="No variables declared on this tree."
              testid={tid('var')}
            />
            <ScopeSection
              title="Constants"
              sigil="$CONST"
              kind="const"
              description="Baked in at tree creation. Read by actions via $CONST; never written after the run starts."
              data={doc.const ?? {}}
              emptyMessage="No constants declared on this tree."
              testid={tid('const')}
            />
          {/if}
        </div>
      </ScrollArea>
    </Tabs.Content>

    <Tabs.Content value="engine" class="min-h-0 overflow-hidden">
      <ScrollArea class="h-full">
        <div class="grid gap-3 p-4" data-testid={tid('engine')}>
          <div class="text-[11px] leading-relaxed text-muted-foreground">
            Engine bookkeeping — per-node status, step index, and retry
            counts. Keys are dot-joined node paths; root is the empty
            string.
          </div>
          <pre
            class="overflow-x-auto rounded-md border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed"
            data-testid={tid('engine-pre')}>{fmt(doc.runtime)}</pre>
        </div>
      </ScrollArea>
    </Tabs.Content>
  </Tabs.Root>
</aside>
