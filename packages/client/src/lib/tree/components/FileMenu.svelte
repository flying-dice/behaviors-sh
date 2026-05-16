<script lang="ts">
  import { makeTid } from "$lib/utils";
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import FolderKanban from '@lucide/svelte/icons/folder-kanban';
  import FilePlus from '@lucide/svelte/icons/file-plus';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Save from '@lucide/svelte/icons/save';
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import Globe from '@lucide/svelte/icons/globe';
  import X from '@lucide/svelte/icons/x';
  import Settings from '@lucide/svelte/icons/settings';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import * as ws from '$lib/workspace/store.svelte';
  import FileUp from '@lucide/svelte/icons/file-up';
  import NewWorkspaceDialog from './NewWorkspaceDialog.svelte';
  import ImportTreeDialog from './ImportTreeDialog.svelte';

  interface Props {
    testid?: string;
  }
  let { testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let newOpen = $state(false);

  let settingsOpen = $state(false);
  let settingsName = $state('');
  let settingsVersion = $state('');

  let deleteSlotOpen = $state(false);
  let deleteSlotTarget = $state<{ id: string; name: string } | null>(null);

  let importDialog: ReturnType<typeof ImportTreeDialog>;

  let errorOpen = $state(false);
  let errorTitle = $state('');
  let errorMessage = $state('');

  function reportError(title: string, err: unknown) {
    console.error(title, err);
    errorTitle = title;
    errorMessage = err instanceof Error ? err.message : String(err);
    errorOpen = true;
  }

  const slots = $derived(ws.listBrowserSlots());
  const current = $derived(ws.getWorkspace());
  const source = $derived(ws.getSource());
  const dirty = $derived(ws.isDirty());

  const sourceLabel = $derived.by(() => {
    if (source.kind === 'browser') return `browser · ${source.slotName}`;
    if (source.kind === 'device') return `device · ${source.filename}`;
    if (current) return 'unsaved';
    return 'no workspace';
  });

  function submitNew(name: string, version: string) {
    ws.newWorkspace(name, version);
  }

  function openBrowserSlot(slotId: string) {
    try {
      ws.openFromBrowser(slotId);
    } catch (err) {
      reportError('Could not open workspace', err);
    }
  }

  async function openFromDevice() {
    try {
      await ws.openFromDevice();
    } catch (err) {
      reportError('Open from device failed', err);
    }
  }

  function saveBrowserNew() {
    try {
      ws.saveAsNewBrowserSlot();
    } catch (err) {
      reportError('Save failed', err);
    }
  }

  function saveBrowserToSlot(slotId: string) {
    try {
      ws.saveToBrowser(slotId);
    } catch (err) {
      reportError('Save failed', err);
    }
  }

  async function saveAsDevice() {
    try {
      await ws.saveAsToDevice();
    } catch (err) {
      reportError('Save to device failed', err);
    }
  }

  async function save() {
    try {
      await ws.save();
    } catch (err) {
      reportError('Save failed', err);
    }
  }

  function closeWorkspace() {
    ws.closeWorkspace();
  }


  function openSettings() {
    if (!current) return;
    settingsName = current.name;
    settingsVersion = current.version;
    settingsOpen = true;
  }

  function submitSettings() {
    const name = settingsName.trim();
    const version = settingsVersion.trim();
    if (!name || !version) return;
    ws.setName(name);
    ws.setVersion(version);
    settingsOpen = false;
  }

  function askDeleteSlot(slot: { id: string; name: string }) {
    deleteSlotTarget = slot;
    deleteSlotOpen = true;
  }

  function confirmDeleteSlot() {
    if (!deleteSlotTarget) return;
    try {
      ws.deleteBrowserSlot(deleteSlotTarget.id);
    } catch (err) {
      reportError('Delete failed', err);
    }
    deleteSlotTarget = null;
    deleteSlotOpen = false;
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        data-testid={tid('trigger')}
        class="flex h-7 items-center gap-2 rounded-md border bg-transparent px-2 text-[12.5px] transition-colors hover:bg-muted/60"
      >
        <FolderKanban class="size-3.5 text-primary" />
        <span class="font-mono text-foreground">
          {current ? current.name : 'untitled'}
        </span>
        {#if current}
          <span class="text-muted-foreground">·</span>
          <span class="font-mono text-[11px] text-muted-foreground">v{current.version}</span>
        {/if}
        {#if dirty}
          <span class="size-1.5 rounded-full bg-amber-500" title="Unsaved changes"></span>
        {/if}
        <ChevronsUpDown class="size-3 text-muted-foreground" />
      </button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-64" align="start" data-testid={tid('content')}>
    <DropdownMenu.Label class="flex items-center justify-between gap-2">
      <span>File</span>
      <span class="font-mono text-[10px] text-muted-foreground">{sourceLabel}</span>
    </DropdownMenu.Label>
    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={() => (newOpen = true)} data-testid={tid('new')}>
      <FilePlus />
      <span>New workspace…</span>
    </DropdownMenu.Item>

    <DropdownMenu.Item
      disabled={!current}
      onclick={() => importDialog.start()}
      data-testid={tid('import-tree')}
    >
      <FileUp />
      <span>Import tree…</span>
    </DropdownMenu.Item>

    <DropdownMenu.Item
      disabled={!current}
      onclick={openSettings}
      data-testid={tid('settings')}
    >
      <Settings />
      <span>Workspace settings…</span>
    </DropdownMenu.Item>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger data-testid={tid('open')}>
        <FolderOpen />
        <span>Open from</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent class="w-56">
        <DropdownMenu.Label class="text-[10px] uppercase tracking-wide text-muted-foreground">
          Browser
        </DropdownMenu.Label>
        {#if slots.length === 0}
          <DropdownMenu.Item disabled>
            <span class="text-muted-foreground">No saved workspaces</span>
          </DropdownMenu.Item>
        {:else}
          {#each slots as slot (slot.id)}
            <DropdownMenu.Item
              onclick={() => openBrowserSlot(slot.id)}
              data-testid={tid(`open-slot-${slot.id}`)}
            >
              <Globe class="text-primary" />
              <span class="flex-1 truncate font-mono text-[12.5px]">{slot.name}</span>
            </DropdownMenu.Item>
          {/each}
        {/if}
        <DropdownMenu.Separator />
        <DropdownMenu.Item onclick={openFromDevice} data-testid={tid('open-device')}>
          <HardDrive />
          <span>Device file…</span>
        </DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    <DropdownMenu.Item disabled={!current} onclick={save} data-testid={tid('save')}>
      <Save />
      <span>Save</span>
      <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
    </DropdownMenu.Item>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger disabled={!current} data-testid={tid('save-as')}>
        <Save />
        <span>Save as</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent class="w-56">
        <DropdownMenu.Item onclick={saveBrowserNew} data-testid={tid('save-as-new')}>
          <Globe />
          <span>New browser slot</span>
        </DropdownMenu.Item>
        {#if slots.length > 0}
          <DropdownMenu.Label class="text-[10px] uppercase tracking-wide text-muted-foreground">
            Overwrite slot
          </DropdownMenu.Label>
          {#each slots as slot (slot.id)}
            <DropdownMenu.Item
              onclick={() => saveBrowserToSlot(slot.id)}
              data-testid={tid(`save-slot-${slot.id}`)}
            >
              <Globe class="text-primary" />
              <span class="flex-1 truncate font-mono text-[12.5px]">{slot.name}</span>
            </DropdownMenu.Item>
          {/each}
        {/if}
        <DropdownMenu.Separator />
        <DropdownMenu.Item onclick={saveAsDevice} data-testid={tid('save-as-device')}>
          <HardDrive />
          <span>Device file…</span>
        </DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    <DropdownMenu.Separator />

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger
        disabled={slots.length === 0}
        data-testid={tid('delete-slot')}
      >
        <Trash2 />
        <span>Delete browser slot</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent class="w-56">
        {#each slots as slot (slot.id)}
          <DropdownMenu.Item
            variant="destructive"
            onclick={() => askDeleteSlot({ id: slot.id, name: slot.name })}
            data-testid={tid(`delete-slot-${slot.id}`)}
          >
            <Trash2 />
            <span class="flex-1 truncate font-mono text-[12.5px]">{slot.name}</span>
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    <DropdownMenu.Item
      disabled={!current}
      variant="destructive"
      onclick={closeWorkspace}
      data-testid={tid('close')}
    >
      <X />
      <span>Close workspace</span>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<NewWorkspaceDialog
  bind:open={newOpen}
  onSubmit={submitNew}
  onClose={() => (newOpen = false)}
  testid={tid?.('new')}
/>

<ImportTreeDialog
  bind:this={importDialog}
  testid={tid?.('import')}
/>

<!-- Workspace settings dialog -->
<Dialog.Root bind:open={settingsOpen}>
  <Dialog.Content class="sm:max-w-md" data-testid={tid('settings-dialog')}>
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
        submitSettings();
      }}
    >
      <div class="flex flex-col gap-1.5">
        <Label for="settings-name">Name</Label>
        <Input
          id="settings-name"
          bind:value={settingsName}
          autofocus
          data-testid={tid('settings-name')}
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="settings-version">Version</Label>
        <Input
          id="settings-version"
          bind:value={settingsVersion}
          data-testid={tid('settings-version')}
        />
      </div>
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => (settingsOpen = false)}
          data-testid={tid('settings-cancel')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!settingsName.trim() || !settingsVersion.trim()}
          data-testid={tid('settings-submit')}
        >
          Save
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete browser slot confirm -->
<Dialog.Root bind:open={deleteSlotOpen}>
  <Dialog.Content class="sm:max-w-md" data-testid={tid('delete-slot-dialog')}>
    <Dialog.Header>
      <Dialog.Title>Delete browser slot?</Dialog.Title>
      <Dialog.Description>
        <span class="font-mono text-foreground">{deleteSlotTarget?.name ?? ''}</span> will be
        removed from this browser. This does not affect any device files.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        type="button"
        variant="outline"
        onclick={() => (deleteSlotOpen = false)}
        data-testid={tid('delete-slot-cancel')}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="destructive"
        class="bg-destructive text-destructive-foreground hover:bg-destructive/80"
        onclick={confirmDeleteSlot}
        data-testid={tid('delete-slot-confirm')}
      >
        <Trash2 /> Delete
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Error dialog -->
<Dialog.Root bind:open={errorOpen}>
  <Dialog.Content class="sm:max-w-md" data-testid={tid('error-dialog')}>
    <Dialog.Header>
      <Dialog.Title>{errorTitle}</Dialog.Title>
      <Dialog.Description>
        <span class="font-mono text-[12.5px]">{errorMessage}</span>
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        type="button"
        onclick={() => (errorOpen = false)}
        data-testid={tid('error-dismiss')}
      >Dismiss</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
