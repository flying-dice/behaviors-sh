<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';

  interface Props {
    open: boolean;
    title: string;
    message: string;
    testid?: string;
  }
  let { open = $bindable(), title, message, testid }: Props = $props();
  const tid = $derived(makeTid(testid));
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={testid}>
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>
        <span class="font-mono text-[12.5px]">{message}</span>
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        type="button"
        onclick={() => (open = false)}
        data-testid={tid('dismiss')}
      >Dismiss</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
