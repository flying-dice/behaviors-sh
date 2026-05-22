<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { stepBody, stepKind, type BehaviourNode } from '@behaviors-sh/spec';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import GitBranchPlus from '@lucide/svelte/icons/git-branch-plus';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import NumberStepper from './NumberStepper.svelte';
  import type { TreeSummary } from '$lib/workspace/store.svelte';
  import { refToTreeId, treeIdToRef } from '../ref';
  import type { CompositeType } from '../tree-ops';
  import { COMPOSITE_TYPES, kindOf, KIND_META, nodeColor } from '../behaviour-layout';

  interface Props {
    node: BehaviourNode | null;
    trees: TreeSummary[];
    currentTreeId: string;
    onSetName: (v: string) => void;
    onSetDescription: (v: string) => void;
    onSetRetries: (text: string) => void;
    onSetCompositeType: (t: CompositeType) => void;
    onSetRef: (v: string) => void;
    onAddStep: (kind: 'evaluate' | 'instruct') => void;
    onRemoveStep: (idx: number) => void;
    onMoveStep: (from: number, to: number) => void;
    onSetStepBody: (idx: number, value: string) => void;
    onWrap: (t: CompositeType) => void;
    onConvertToRef: () => void;
    onConvertRefToAction: () => void;
    onOpenLinkedTree: (id: string) => void;
    testid?: string;
  }

  let {
    node,
    trees,
    currentTreeId,
    onSetName,
    onSetDescription,
    onSetRetries,
    onSetCompositeType,
    onSetRef,
    onAddStep,
    onRemoveStep,
    onMoveStep,
    onSetStepBody,
    onWrap,
    onConvertToRef,
    onConvertRefToAction,
    onOpenLinkedTree,
    testid,
  }: Props = $props();
  const tid = $derived(makeTid(testid));

  const nodeKind = $derived.by(() => node ? kindOf(node) : null);
  const accentColor = $derived(nodeKind ? nodeColor(nodeKind) : undefined);

  const isRef = $derived(!!node && '$ref' in node);
  const isAction = $derived(!!node && !('$ref' in node) && node.type === 'action');
  const isComposite = $derived(
    !!node && !('$ref' in node) && node.type !== 'action',
  );

  const selName = $derived.by(() =>
    node && !('$ref' in node) ? node.name : '',
  );
  const selDescription = $derived.by(() =>
    node && !('$ref' in node) ? (node.description ?? '') : '',
  );
  const selRetries = $derived.by(() =>
    node && !('$ref' in node) && node.retries != null ? String(node.retries) : '',
  );
  const selLinkedTreeId = $derived.by(() =>
    node && '$ref' in node ? refToTreeId(node.$ref) : null,
  );
  const linkableTrees = $derived(trees.filter((t) => t.id !== currentTreeId));
  const selLinkedTreeName = $derived.by(() => {
    const id = selLinkedTreeId;
    if (!id) return null;
    return trees.find((t) => t.id === id)?.name ?? id;
  });
  const selCompositeType = $derived.by<CompositeType | null>(() => {
    if (!node || '$ref' in node || node.type === 'action') return null;
    return node.type;
  });

  let dragIdx = $state<number | null>(null);
  let dropIdx = $state<number | null>(null);

  function onDragStart(e: PointerEvent, idx: number) {
    e.preventDefault();
    dragIdx = idx;
    dropIdx = idx;
    const container = (e.currentTarget as HTMLElement).closest('[data-testid$="steps-section"]')!;
    const cards = [...container.querySelectorAll<HTMLElement>('[data-step-idx]')];

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      for (let c = 0; c < cards.length; c++) {
        const rect = cards[c]!.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (ev.clientY < mid) { dropIdx = c; return; }
      }
      dropIdx = cards.length - 1;
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (dragIdx != null && dropIdx != null && dragIdx !== dropIdx) {
        onMoveStep(dragIdx, dropIdx);
      }
      dragIdx = null;
      dropIdx = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function pickLinkedTree(id: string) {
    onSetRef(treeIdToRef(id));
  }
</script>

{#if !node}
  <div data-testid={tid('empty')} class="text-xs text-muted-foreground">
    Select a node to inspect.
  </div>
{:else}
  <div data-testid={testid} class="flex flex-col gap-5">
    {#if isRef}
      <section class="flex flex-col gap-3" data-testid={tid('linked-tree-section')}>
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold tracking-tight">
            <span class="font-mono" style:color={accentColor}>↪</span> Linked tree
          </h2>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="linked-tree">Tree</Label>
          {#if linkableTrees.length === 0}
            <p
              class="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
              data-testid={tid('linked-tree-empty')}
            >
              No other trees in this workspace yet. Create another tree from the Collections view to link to it.
            </p>
          {:else}
            <Select.Root
              type="single"
              value={selLinkedTreeId ?? ''}
              onValueChange={(v) => v && pickLinkedTree(v)}
            >
              <Select.Trigger class="w-full" data-testid={tid('linked-tree-trigger')}>
                {selLinkedTreeName ?? 'Pick a tree…'}
              </Select.Trigger>
              <Select.Content>
                {#each linkableTrees as t (t.id)}
                  <Select.Item value={t.id} data-testid={tid(`linked-tree-option-${t.id}`)}>
                    {t.name}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {/if}
          <p class="text-xs text-muted-foreground">
            Runs the chosen tree in place of this node.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if selLinkedTreeId}
            <Button
              variant="outline"
              class="self-start"
              onclick={() => onOpenLinkedTree(selLinkedTreeId!)}
              data-testid={tid('linked-tree-open')}
            >
              <ExternalLink class="size-3.5" /> Open tree
            </Button>
          {/if}
          <Button
            variant="outline"
            class="self-start"
            onclick={onConvertRefToAction}
            data-testid={tid('convert-to-action')}
          >
            Replace with action
          </Button>
        </div>
      </section>
    {:else}
      <section class="flex flex-col gap-3" data-testid={tid('node-section')}>
        <h2 class="text-sm font-semibold tracking-tight">
          {#if nodeKind}
            <span class="font-mono" style:color={accentColor}>{KIND_META[nodeKind].glyph}</span>
          {/if}
          {isAction ? 'Action' : 'Composite'}
        </h2>

        <div class="flex flex-col gap-1.5">
          <Label for="node-name">Name</Label>
          <Input
            id="node-name"
            value={selName}
            oninput={(e) => onSetName(e.currentTarget.value)}
            data-testid={tid('name')}
          />
          <p class="text-xs text-muted-foreground">A short name for this node. No '/' or '@'.</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="node-description">Description</Label>
          <Textarea
            id="node-description"
            value={selDescription}
            placeholder="What does this node do?"
            oninput={(e) => onSetDescription(e.currentTarget.value)}
            rows={2}
            data-testid={tid('description')}
          />
          <p class="text-xs text-muted-foreground">Optional. Helps others understand the node's purpose.</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="node-retries">Retries</Label>
          <NumberStepper
            id="node-retries"
            testid={tid('retries')}
            value={selRetries}
            min={1}
            onChange={onSetRetries}
          />
          <p class="text-xs text-muted-foreground">How many times to retry on failure. Leave empty for no retries.</p>
        </div>

        {#if isComposite && selCompositeType}
          <div class="flex flex-col gap-1.5">
            <Label>Composite type</Label>
            <div class="grid grid-cols-3 gap-2" data-testid={tid('composite-type')}>
              {#each COMPOSITE_TYPES as t (t)}
                <button
                  type="button"
                  class="rounded-md border px-3 py-2 text-left text-[12.5px] transition-colors {selCompositeType === t ? '' : 'hover:bg-muted/60'}"
                  style:border-color={selCompositeType === t ? nodeColor(t) : undefined}
                  style:background={selCompositeType === t ? `color-mix(in srgb, ${nodeColor(t)} 8%, transparent)` : undefined}
                  onclick={() => onSetCompositeType(t)}
                  data-testid={tid(`composite-type-${t}`)}
                >
                  <span class="font-mono" style:color={nodeColor(t)}>{KIND_META[t].glyph}</span>
                  <span class="font-mono">{t}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </section>

      {#if isAction && !('$ref' in node) && node.type === 'action'}
        <section class="flex flex-col gap-3" data-testid={tid('steps-section')}>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold tracking-tight">Steps</h2>
            <div class="flex-1"></div>
            <Button
              variant="outline"
              class="h-7 px-2"
              onclick={() => onAddStep('evaluate')}
              data-testid={tid('add-step-evaluate')}
            >
              <PlusIcon class="size-3.5" /> evaluate
            </Button>
            <Button
              variant="outline"
              class="h-7 px-2"
              onclick={() => onAddStep('instruct')}
              data-testid={tid('add-step-instruct')}
            >
              <PlusIcon class="size-3.5" /> instruct
            </Button>
          </div>

          {#each node.steps as step, i (i)}
            {@const kind = stepKind(step)}
            {@const body = stepBody(step)}
            {@const showBefore = dragIdx != null && dropIdx === i && dropIdx < dragIdx}
            {@const showAfter = dragIdx != null && dropIdx === i && dropIdx > dragIdx}
            <div
              class="relative flex flex-col gap-1.5 rounded-md border p-3 transition-opacity {dragIdx === i ? 'opacity-50' : ''}"
              data-testid={tid(`step-${i}`)}
              data-step-idx={i}
            >
              {#if showBefore}
                <div class="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-primary"></div>
              {/if}
              {#if showAfter}
                <div class="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-primary"></div>
              {/if}
              <div class="flex items-center gap-2">
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                  data-testid={tid(`step-${i}-drag`)}
                  onpointerdown={(e) => onDragStart(e, i)}
                >
                  <GripVertical class="size-4" />
                </div>
                <span
                  class="font-mono text-[11px] uppercase tracking-wide"
                  style:color="var(--color-abtree-green)"
                >
                  {kind}
                </span>
                <span class="flex-1"></span>
                <Button
                  variant="ghost"
                  class="h-6 w-6 p-0"
                  onclick={() => onMoveStep(i, i - 1)}
                  disabled={i === 0}
                  data-testid={tid(`step-${i}-up`)}
                >
                  <ArrowUp class="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  class="h-6 w-6 p-0"
                  onclick={() => onMoveStep(i, i + 1)}
                  disabled={i === node.steps.length - 1}
                  data-testid={tid(`step-${i}-down`)}
                >
                  <ArrowDown class="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  class="h-6 px-2 text-destructive"
                  onclick={() => onRemoveStep(i)}
                  disabled={node.steps.length <= 1}
                  data-testid={tid(`step-${i}-remove`)}
                >
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
              <Textarea
                value={body}
                placeholder={kind === 'instruct' ? 'Tell the agent what to do, in one step.' : 'A condition to evaluate. Return truthy to pass.'}
                oninput={(e) => onSetStepBody(i, e.currentTarget.value)}
                rows={2}
                data-testid={tid(`step-${i}-body`)}
              />
            </div>
          {/each}
        </section>
      {/if}
    {/if}

    <section class="flex flex-col gap-2 border-t pt-4" data-testid={tid('transform-section')}>
      <h2 class="text-sm font-semibold tracking-tight">Transform</h2>
      <p class="text-xs text-muted-foreground">
        Wrap the selected node inside a new composite parent, or replace it with a link to another tree.
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          class="h-7"
          onclick={() => onWrap('sequence')}
          data-testid={tid('wrap-sequence')}
        >
          <GitBranchPlus class="size-3.5" /> Wrap in sequence
        </Button>
        <Button
          variant="outline"
          class="h-7"
          onclick={() => onWrap('selector')}
          data-testid={tid('wrap-selector')}
        >
          <GitBranchPlus class="size-3.5" /> Wrap in selector
        </Button>
        <Button
          variant="outline"
          class="h-7"
          onclick={() => onWrap('parallel')}
          data-testid={tid('wrap-parallel')}
        >
          <GitBranchPlus class="size-3.5" /> Wrap in parallel
        </Button>
        {#if !isRef}
          <Button
            variant="outline"
            class="h-7"
            onclick={onConvertToRef}
            data-testid={tid('convert-to-link')}
          >
            Replace with linked tree
          </Button>
        {/if}
      </div>
    </section>
  </div>
{/if}
