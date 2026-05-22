<script lang="ts">
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { errorMessage, makeTid } from "$lib/utils";
import * as ws from "$lib/workspace/store.svelte";
import DanglingRefsWarning from "./DanglingRefsWarning.svelte";

interface Props {
	open: boolean;
	treeId: string;
	testid?: string;
}
let { open = $bindable(), treeId, testid }: Props = $props();
const tid = $derived(makeTid(testid));

let newId = $state("");
let error = $state("");

const refHits = $derived(treeId ? ws.findTreeRefs(treeId) : ([] as string[]));

$effect(() => {
	if (open) {
		newId = treeId;
		error = "";
	}
});

function submit() {
	const trimmed = newId.trim();
	if (!trimmed || trimmed === treeId) {
		open = false;
		return;
	}
	try {
		ws.renameTree(treeId, trimmed);
		open = false;
	} catch (err) {
		error = errorMessage(err);
	}
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md" data-testid={testid}>
    <Dialog.Header>
      <Dialog.Title>Rename tree</Dialog.Title>
      <Dialog.Description>
        Renaming changes the workspace key. Other trees that link to this tree are
        <strong>not</strong> rewired automatically.
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
        <Label>Old id</Label>
        <Input value={treeId} disabled data-testid={tid('old')} />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="rename-new-id">New id</Label>
        <Input
          id="rename-new-id"
          bind:value={newId}
          autofocus
          data-testid={tid('new')}
        />
      </div>
      <DanglingRefsWarning count={refHits.length} treeId={treeId} testid={tid('warn')} />
      {#if error}
        <p class="text-xs text-destructive" data-testid={tid('error')}>{error}</p>
      {/if}
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
          disabled={!newId.trim() || newId.trim() === treeId}
          data-testid={tid('submit')}
        >
          Rename
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
