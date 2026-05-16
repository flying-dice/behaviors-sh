<script lang="ts">
  import { makeTid } from "$lib/utils";
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  interface Props {
    open: boolean;
    onSubmit: (name: string, version: string) => void;
    onClose: () => void;
    testid?: string;
  }
  let { open = $bindable(), onSubmit, onClose, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let name = $state('');
  let version = $state('0.1.0');

  function reset() {
    name = '';
    version = '0.1.0';
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, version.trim() || '0.1.0');
    reset();
    open = false;
  }

  function cancel() {
    reset();
    onClose();
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={tid?.('dialog')}>
    <Dialog.Header>
      <Dialog.Title>New workspace</Dialog.Title>
      <Dialog.Description>
        A workspace bundles named behaviour trees. Pick a name and version to get started.
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
        <Label for="workspace-name">Name</Label>
        <Input
          id="workspace-name"
          bind:value={name}
          placeholder="my-workspace"
          autofocus
          data-testid={tid?.('name')}
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="workspace-version">Version</Label>
        <Input
          id="workspace-version"
          bind:value={version}
          placeholder="0.1.0"
          data-testid={tid?.('version')}
        />
      </div>
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={cancel}
          data-testid={tid?.('cancel')}
        >Cancel</Button>
        <Button
          type="submit"
          disabled={!name.trim()}
          data-testid={tid?.('submit')}
        >Create</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
