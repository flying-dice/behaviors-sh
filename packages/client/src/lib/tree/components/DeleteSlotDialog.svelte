<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  interface Props {
    open: boolean;
    slotName: string;
    onConfirm: () => void;
    testid?: string;
  }
  let { open = $bindable(), slotName, onConfirm, testid }: Props = $props();
  const tid = $derived(makeTid(testid));
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={testid}>
    <Dialog.Header>
      <Dialog.Title>Delete browser slot?</Dialog.Title>
      <Dialog.Description>
        <span class="font-mono text-foreground">{slotName}</span> will be
        removed from this browser. This does not affect any device files.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        type="button"
        variant="outline"
        onclick={() => (open = false)}
        data-testid={tid('cancel')}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="destructive"
        onclick={onConfirm}
        data-testid={tid('confirm')}
      >
        <Trash2 /> Delete
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
