<script lang="ts">
  import { makeTid, errorMessage } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-sh/spec';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as ws from '$lib/workspace/store.svelte';
  import { pickAndParseTree } from '$lib/workspace/serialize';

  interface Props {
    onCreated?: (id: string) => void;
    testid?: string;
  }
  let { onCreated, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let open = $state(false);
  let importId = $state('');
  let importNode = $state<BehaviourNode | null>(null);
  let error = $state('');

  export async function start() {
    try {
      const result = await pickAndParseTree();
      if (!result) return;
      importNode = result.node;
      importId = result.id;
      error = '';
      open = true;
    } catch (err) {
      console.error('Import failed', err);
    }
  }

  function submit() {
    const id = importId.trim();
    if (!id || !importNode) return;
    try {
      ws.createTree(id, importNode);
      open = false;
      onCreated?.(id);
    } catch (err) {
      error = errorMessage(err);
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={tid?.('dialog')}>
    <Dialog.Header>
      <Dialog.Title>Import tree</Dialog.Title>
      <Dialog.Description>
        The file was parsed and validated. Choose an ID for the new tree.
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
        <Label for="import-tree-id">Tree ID</Label>
        <Input
          id="import-tree-id"
          bind:value={importId}
          placeholder="my-tree"
          autofocus
          data-testid={tid?.('id')}
        />
        <p class="text-xs text-muted-foreground">No '/' or '@'. Used as the workspace key.</p>
      </div>
      {#if error}
        <p class="text-xs text-destructive" data-testid={tid?.('error')}>{error}</p>
      {/if}
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => (open = false)}
          data-testid={tid?.('cancel')}
        >Cancel</Button>
        <Button
          type="submit"
          disabled={!importId.trim()}
          data-testid={tid?.('submit')}
        >Import</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
