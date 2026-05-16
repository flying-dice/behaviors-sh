<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import DanglingRefsWarning from './DanglingRefsWarning.svelte';
  import * as ws from '$lib/workspace/store.svelte';

  interface Props {
    open: boolean;
    treeId: string;
    testid?: string;
  }
  let { open = $bindable(), treeId, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  const refHits = $derived(treeId ? ws.findTreeRefs(treeId) : ([] as string[]));

  function submit() {
    try {
      ws.deleteTree(treeId);
    } finally {
      open = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={testid}>
    <Dialog.Header>
      <Dialog.Title>Delete tree?</Dialog.Title>
      <Dialog.Description>
        <span class="font-mono text-foreground">{treeId}</span> will be removed from the
        workspace. This cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <DanglingRefsWarning count={refHits.length} {treeId} testid={tid('warn')} />
    <Dialog.Footer>
      <Button
        type="button"
        variant="outline"
        onclick={() => (open = false)}
        data-testid={tid('cancel')}
      >Cancel</Button>
      <Button
        type="button"
        variant="destructive"
        onclick={submit}
        data-testid={tid('confirm')}
      >
        <Trash2 /> Delete
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
