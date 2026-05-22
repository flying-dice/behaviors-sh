<script lang="ts">
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { makeTid } from "$lib/utils";

interface Props {
	open: boolean;
	initialName: string;
	initialVersion: string;
	onSubmit: (name: string, version: string) => void;
	testid?: string;
}
let {
	open = $bindable(),
	initialName,
	initialVersion,
	onSubmit,
	testid,
}: Props = $props();
const tid = $derived(makeTid(testid));

let name = $state("");
let version = $state("");

$effect(() => {
	if (open) {
		name = initialName;
		version = initialVersion;
	}
});

function submit() {
	const n = name.trim();
	const v = version.trim();
	if (!n || !v) return;
	onSubmit(n, v);
	open = false;
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={tid('dialog')}>
    <Dialog.Header>
      <Dialog.Title>Workspace settings</Dialog.Title>
      <Dialog.Description>
        Edit the workspace name and version. Changes mark the workspace dirty until saved.
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
        <Label for="settings-name">Name</Label>
        <Input
          id="settings-name"
          bind:value={name}
          autofocus
          data-testid={tid('name')}
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="settings-version">Version</Label>
        <Input
          id="settings-version"
          bind:value={version}
          data-testid={tid('version')}
        />
      </div>
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
          type="submit"
          disabled={!name.trim() || !version.trim()}
          data-testid={tid('submit')}
        >
          Save
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
