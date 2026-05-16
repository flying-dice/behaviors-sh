<script lang="ts">
  import { makeTid } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-ui/behavior-spec';
  import * as Tabs from '$lib/components/ui/tabs';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Button } from '$lib/components/ui/button';
  import Copy from '@lucide/svelte/icons/copy';
  import BehaviourInspector from './BehaviourInspector.svelte';
  import YamlPanel from './YamlPanel.svelte';
  import type { TreeSummary } from '$lib/workspace/store.svelte';

  type Tab = 'inspector' | 'yaml';

  interface Props {
    tab: Tab;
    onTabChange: (t: Tab) => void;
    node: BehaviourNode | null;
    yaml: string;
    trees: TreeSummary[];
    currentTreeId: string;
    onSetName: (v: string) => void;
    onSetDescription: (v: string) => void;
    onSetRetries: (v: string) => void;
    onSetCompositeType: (t: 'sequence' | 'selector' | 'parallel') => void;
    onSetRef: (v: string) => void;
    onAddStep: (kind: 'evaluate' | 'instruct') => void;
    onRemoveStep: (idx: number) => void;
    onSetStepBody: (idx: number, value: string) => void;
    onWrap: (t: 'sequence' | 'selector' | 'parallel') => void;
    onConvertToRef: () => void;
    onConvertRefToAction: () => void;
    onOpenLinkedTree: (id: string) => void;
    testid?: string;
  }

  let {
    tab,
    onTabChange,
    node,
    yaml,
    trees,
    currentTreeId,
    onSetName,
    onSetDescription,
    onSetRetries,
    onSetCompositeType,
    onSetRef,
    onAddStep,
    onRemoveStep,
    onSetStepBody,
    onWrap,
    onConvertToRef,
    onConvertRefToAction,
    onOpenLinkedTree,
    testid,
  }: Props = $props();
  const tid = $derived(makeTid(testid));

  function copyYaml() {
    navigator.clipboard?.writeText(yaml);
  }
</script>

<aside data-testid={testid} class="flex h-full flex-col border-l bg-card">
  <Tabs.Root
    value={tab}
    onValueChange={(v) => onTabChange(v as Tab)}
    class="flex h-full min-h-0 flex-col"
  >
    <div class="flex items-center gap-1 border-b px-3 pt-2">
      <Tabs.List variant="line" class="border-0">
        <Tabs.Trigger value="inspector" data-testid={tid('tab-inspector')}>
          Inspector
        </Tabs.Trigger>
        <Tabs.Trigger value="yaml" data-testid={tid('tab-yaml')}>YAML</Tabs.Trigger>
      </Tabs.List>
      <div class="flex-1"></div>
      {#if tab === 'yaml'}
        <Button
          variant="ghost"
          size="icon"
          title="Copy YAML"
          onclick={copyYaml}
          data-testid={tid('copy-yaml')}
        >
          <Copy />
        </Button>
      {/if}
    </div>

    <div class="min-h-0 flex-1">
      <ScrollArea class="h-full">
        <div class="p-4">
          {#if tab === 'inspector'}
            <BehaviourInspector
              testid={tid('inspector')}
              {node}
              {trees}
              {currentTreeId}
              {onSetName}
              {onSetDescription}
              {onSetRetries}
              {onSetCompositeType}
              {onSetRef}
              {onAddStep}
              {onRemoveStep}
              {onSetStepBody}
              {onWrap}
              {onConvertToRef}
              {onConvertRefToAction}
              {onOpenLinkedTree}
            />
          {:else}
            <YamlPanel testid={tid('yaml')} {yaml} />
          {/if}
        </div>
      </ScrollArea>
    </div>
  </Tabs.Root>
</aside>
