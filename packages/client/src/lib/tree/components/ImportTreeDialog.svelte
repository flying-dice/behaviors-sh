<script lang="ts">
  import { makeTid } from "$lib/utils";
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  interface Props {
    open: boolean;
    importId: string;
    error?: string;
    onSubmit: (id: string) => void;
    onClose: () => void;
    testid?: string;
  }
  let { open = $bindable(), importId = $bindable(), error, onSubmit, onClose, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  function submit() {
    const id = importId.trim();
    if (!id) return;
    onSubmit(id);
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
          onclick={onClose}
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
