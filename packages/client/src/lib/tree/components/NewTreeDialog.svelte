<script lang="ts">
  import { makeTid } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-sh/spec';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { defaultAction, defaultComposite } from '../tree-ops';

  type NodeType = 'action' | 'sequence' | 'selector' | 'parallel';

  interface Props {
    open: boolean;
    error?: string;
    onSubmit: (id: string, node: BehaviourNode) => void;
    onClose: () => void;
    testid?: string;
  }
  let { open = $bindable(), error, onSubmit, onClose, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let id = $state('');
  let nodeType = $state<NodeType>('action');

  $effect(() => {
    if (open) {
      id = '';
      nodeType = 'action';
    }
  });

  function seedNode(type: NodeType, name: string): BehaviourNode {
    if (type === 'action') return defaultAction(name);
    return defaultComposite(type, name);
  }

  function submit() {
    const trimmed = id.trim();
    if (!trimmed) return;
    onSubmit(trimmed, seedNode(nodeType, trimmed));
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={tid?.('dialog')}>
    <Dialog.Header>
      <Dialog.Title>New tree</Dialog.Title>
      <Dialog.Description>
        Pick an id (used to link from other trees) and the root node type.
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="flex flex-col gap-3"
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div class="flex flex-col gap-1.5">
        <Label for="new-tree-id">Id</Label>
        <Input
          id="new-tree-id"
          bind:value={id}
          placeholder="greet-user"
          autofocus
          data-testid={tid?.('id')}
        />
        <p class="text-xs text-muted-foreground">No '/' or '@'.</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label>Root type</Label>
        <div class="grid grid-cols-2 gap-2" data-testid={tid?.('type')}>
          {#each ['action', 'sequence', 'selector', 'parallel'] as const as t (t)}
            <button
              type="button"
              class="rounded-md border px-3 py-2 text-left text-[12.5px] transition-colors {nodeType === t ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'}"
              onclick={() => (nodeType = t)}
              data-testid={tid?.(`type-${t}`)}
            >
              <div class="font-mono">{t}</div>
              <div class="text-[10.5px] text-muted-foreground">
                {t === 'action' ? '1 step seeded' : '1 action child seeded'}
              </div>
            </button>
          {/each}
        </div>
      </div>
      {#if error}
        <p class="text-xs text-destructive" data-testid={tid?.('error')}>{error}</p>
      {/if}
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={onClose}
          data-testid={tid?.('cancel')}
        >Cancel</Button>
        <Button
          type="submit"
          disabled={!id.trim()}
          data-testid={tid?.('submit')}
        >Create</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
