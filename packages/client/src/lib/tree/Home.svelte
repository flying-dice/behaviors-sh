<script lang="ts">
  import { makeTid } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-ui/behavior-spec';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import Search from '@lucide/svelte/icons/search';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Boxes from '@lucide/svelte/icons/boxes';
  import FolderPlus from '@lucide/svelte/icons/folder-plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import Globe from '@lucide/svelte/icons/globe';
  import FileUp from '@lucide/svelte/icons/file-up';
  import TreeCard from './components/TreeCard.svelte';
  import NewWorkspaceDialog from './components/NewWorkspaceDialog.svelte';
  import ImportTreeDialog from './components/ImportTreeDialog.svelte';
  import NewTreeDialog from './components/NewTreeDialog.svelte';
  import DanglingRefsWarning from './components/DanglingRefsWarning.svelte';
  import Kbd from './components/Kbd.svelte';
  import * as ws from '$lib/workspace/store.svelte';

  interface Props {
    onOpenTree: (id: string) => void;
    onMarketplace: () => void;
    testid?: string;
  }
  let { onOpenTree, onMarketplace, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  const workspace = $derived(ws.getWorkspace());
  const trees = $derived(ws.listTrees());
  const slots = $derived(ws.listBrowserSlots());

  const stats = $derived([
    { label: 'Trees', value: trees.length },
    { label: 'Composites', value: trees.filter((t) => t.kind === 'sequence' || t.kind === 'selector' || t.kind === 'parallel').length },
    { label: 'Actions', value: trees.filter((t) => t.kind === 'action').length },
    { label: 'Links', value: trees.filter((t) => t.kind === 'ref').length },
  ]);

  let filter = $state('');
  const filtered = $derived(
    trees.filter(
      (t) =>
        t.name.toLowerCase().includes(filter.toLowerCase()) ||
        t.id.toLowerCase().includes(filter.toLowerCase()),
    ),
  );

  // ---- Landing page (no workspace) --------------------------------------

  let wsDialogOpen = $state(false);

  function submitWs(name: string, version: string) {
    ws.newWorkspace(name, version);
  }

  async function openFromDevice() {
    try {
      await ws.openFromDevice();
    } catch (err) {
      console.error('Open from device failed', err);
    }
  }

  function openBrowserSlot(slotId: string) {
    try {
      ws.openFromBrowser(slotId);
    } catch (err) {
      console.error('Could not open workspace', err);
    }
  }

  function formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  let importDialog: ReturnType<typeof ImportTreeDialog>;

  // ---- New tree dialog --------------------------------------------------

  let newOpen = $state(false);
  let newError = $state('');

  function submitNewTree(id: string, node: BehaviourNode) {
    try {
      ws.createTree(id, node);
      newOpen = false;
      newError = '';
      onOpenTree(id);
    } catch (err) {
      newError = err instanceof Error ? err.message : String(err);
    }
  }

  // ---- Rename dialog ----------------------------------------------------

  let renameOpen = $state(false);
  let renameOldId = $state('');
  let renameNewId = $state('');
  let renameError = $state('');
  const renameRefHits = $derived(
    renameOldId ? ws.findTreeRefs(renameOldId) : ([] as string[]),
  );

  function askRename(id: string) {
    renameOldId = id;
    renameNewId = id;
    renameError = '';
    renameOpen = true;
  }

  function submitRename() {
    const newIdValue = renameNewId.trim();
    if (!newIdValue || newIdValue === renameOldId) {
      renameOpen = false;
      return;
    }
    try {
      ws.renameTree(renameOldId, newIdValue);
      renameOpen = false;
    } catch (err) {
      renameError = err instanceof Error ? err.message : String(err);
    }
  }

  // ---- Delete dialog ----------------------------------------------------

  let deleteOpen = $state(false);
  let deleteId = $state('');
  const deleteRefHits = $derived(
    deleteId ? ws.findTreeRefs(deleteId) : ([] as string[]),
  );

  function askDelete(id: string) {
    deleteId = id;
    deleteOpen = true;
  }

  function submitDelete() {
    try {
      ws.deleteTree(deleteId);
    } finally {
      deleteOpen = false;
      deleteId = '';
    }
  }
</script>

<ScrollArea class="h-full" data-testid={testid}>
  <div class="mx-auto max-w-[1280px] px-12 pb-16 pt-8">
    {#if !workspace}
      <div class="flex flex-col items-center pt-8" data-testid={tid('landing')}>
        <div class="mb-8 grid size-14 place-items-center rounded-xl border border-dashed border-border/60">
          <FolderPlus class="size-6 text-muted-foreground" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Open a workspace to get started
        </h1>
        <p class="mx-auto mt-2.5 max-w-[460px] text-center text-sm leading-relaxed text-muted-foreground">
          A workspace bundles named behaviour trees into a single, versionable unit.
          Create one from scratch or open an existing file.
        </p>

        <div class="mt-10 grid w-full max-w-[520px] grid-cols-2 gap-3">
          <button
            onclick={() => (wsDialogOpen = true)}
            data-testid={tid('landing-new')}
            class="group flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-transparent p-6 text-center transition-all hover:border-primary hover:bg-primary/5"
          >
            <div class="grid size-10 place-items-center rounded-md border border-current text-muted-foreground transition-colors group-hover:text-primary">
              <PlusIcon class="size-[18px]" />
            </div>
            <div class="font-semibold">New workspace</div>
            <div class="text-xs text-muted-foreground">Start from scratch</div>
          </button>
          <button
            onclick={openFromDevice}
            data-testid={tid('landing-device')}
            class="group flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-transparent p-6 text-center transition-all hover:border-primary hover:bg-primary/5"
          >
            <div class="grid size-10 place-items-center rounded-md border border-current text-muted-foreground transition-colors group-hover:text-primary">
              <HardDrive class="size-[18px]" />
            </div>
            <div class="font-semibold">Open from device</div>
            <div class="text-xs text-muted-foreground">Load a JSON or YAML file</div>
          </button>
        </div>

        {#if slots.length > 0}
          <div class="mt-10 w-full max-w-[520px]">
            <h2 class="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Saved in this browser
            </h2>
            <div class="flex flex-col gap-1.5">
              {#each slots as slot (slot.id)}
                <button
                  onclick={() => openBrowserSlot(slot.id)}
                  data-testid={tid(`landing-slot-${slot.id}`)}
                  class="flex items-center gap-3 rounded-md border bg-transparent px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <Globe class="size-4 text-primary" />
                  <span class="flex-1 truncate font-mono text-sm">{slot.name}</span>
                  <span class="text-xs text-muted-foreground">{formatTime(slot.savedAt)}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <button
          onclick={onMarketplace}
          data-testid={tid('landing-marketplace')}
          class="mt-10 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Or browse the marketplace &rarr;
        </button>
      </div>
    {:else}
      <!-- hero -->
      <Card class="mb-7 p-0">
        <CardContent class="flex flex-wrap items-start justify-between gap-6 p-8">
          <div class="max-w-[560px]">
            <div class="mb-2.5 flex items-center gap-2 text-[11px] font-medium">
              <span class="text-primary">{workspace.name}</span>
              <span class="text-muted-foreground">·</span>
              <span class="font-mono text-muted-foreground">v{workspace.version}</span>
            </div>
            <h1 class="text-3xl font-semibold leading-tight tracking-tight">
              Author behaviour trees that don't drift.
            </h1>
            <p class="mt-2.5 max-w-[520px] text-sm leading-relaxed text-muted-foreground">
              Define agent workflows as YAML trees. The runtime hands the agent one step at a time,
              verifies the result, and persists the cursor — so flows stay reproducible no matter how
              big they get.
            </p>
          </div>
          <div class="flex min-w-[200px] flex-col gap-2.5">
            <Button onclick={() => (newOpen = true)} data-testid={tid('new-tree')}>
              <PlusIcon /> New tree
            </Button>
            <Button variant="outline" onclick={() => importDialog.start()} data-testid={tid('import-tree')}>
              <FileUp /> Import tree
            </Button>
            <Button
              variant="outline"
              onclick={onMarketplace}
              data-testid={tid('browse-marketplace')}
            >
              <Boxes /> Browse marketplace
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- toolbar -->
      <div class="mb-4 flex items-center gap-3">
        <h2 class="m-0 text-lg font-semibold tracking-tight">Trees in this workspace</h2>
        <Badge variant="secondary">{trees.length}</Badge>
        <div class="flex-1"></div>
        <div class="flex h-8 min-w-[260px] items-center gap-2 rounded-md border px-2.5">
          <Search class="size-3.5 text-muted-foreground" />
          <input
            class="flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            placeholder="Filter trees…"
            bind:value={filter}
            data-testid={tid('filter')}
          />
          <Kbd>/</Kbd>
        </div>
      </div>

      <!-- grid -->
      <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4" data-testid={tid('tree-grid')}>
        {#each filtered as t (t.id)}
          <TreeCard
            testid={tid(`tree-${t.id}`)}
            tree={t}
            onOpen={() => onOpenTree(t.id)}
            onRename={() => askRename(t.id)}
            onDelete={() => askDelete(t.id)}
          />
        {/each}

        <button
          onclick={() => (newOpen = true)}
          data-testid={tid('new-tree-card')}
          class="group flex min-h-[182px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-md border border-dashed border-border bg-transparent text-muted-foreground transition-all hover:border-primary hover:text-primary"
        >
          <div class="grid size-10 place-items-center rounded-md border border-current">
            <PlusIcon class="size-[18px]" />
          </div>
          <div class="font-semibold">New tree</div>
          <div class="font-mono text-xs">or <span class="text-foreground">⌘ N</span></div>
        </button>
      </div>

      <!-- stats row -->
      <div class="mt-9 grid grid-cols-4 gap-4" data-testid={tid('stats')}>
        {#each stats as s (s.label)}
          <Card class="p-0" data-testid={tid(`stats-${s.label.toLowerCase()}`)}>
            <CardContent class="p-4">
              <div class="text-[13px] text-muted-foreground">{s.label}</div>
              <div class="mt-1.5 text-2xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        {/each}
      </div>
    {/if}
  </div>
</ScrollArea>

<NewTreeDialog
  bind:open={newOpen}
  error={newError}
  onSubmit={submitNewTree}
  onClose={() => (newOpen = false)}
  testid={tid?.('new-tree')}
/>

<!-- Rename tree dialog -->
<Dialog.Root bind:open={renameOpen}>
  <Dialog.Content class="sm:max-w-md" data-testid={tid('rename-dialog')}>
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
        submitRename();
      }}
    >
      <div class="flex flex-col gap-1.5">
        <Label>Old id</Label>
        <Input value={renameOldId} disabled data-testid={tid('rename-old')} />
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="rename-new-id">New id</Label>
        <Input
          id="rename-new-id"
          bind:value={renameNewId}
          autofocus
          data-testid={tid('rename-new')}
        />
      </div>
      <DanglingRefsWarning count={renameRefHits.length} treeId={renameOldId} testid={tid('rename-warn')} />
      {#if renameError}
        <p class="text-xs text-destructive" data-testid={tid('rename-error')}>{renameError}</p>
      {/if}
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => (renameOpen = false)}
          data-testid={tid('rename-cancel')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!renameNewId.trim() || renameNewId.trim() === renameOldId}
          data-testid={tid('rename-submit')}
        >
          Rename
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete tree dialog -->
<Dialog.Root bind:open={deleteOpen}>
  <Dialog.Content class="sm:max-w-md" data-testid={tid('delete-dialog')}>
    <Dialog.Header>
      <Dialog.Title>Delete tree?</Dialog.Title>
      <Dialog.Description>
        <span class="font-mono text-foreground">{deleteId}</span> will be removed from the
        workspace. This cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <DanglingRefsWarning count={deleteRefHits.length} treeId={deleteId} testid={tid('delete-warn')} />
    <Dialog.Footer>
      <Button
        type="button"
        variant="outline"
        onclick={() => (deleteOpen = false)}
        data-testid={tid('delete-cancel')}
      >Cancel</Button>
      <Button
        type="button"
        variant="destructive"
        class="bg-destructive text-destructive-foreground hover:bg-destructive/80"
        onclick={submitDelete}
        data-testid={tid('delete-confirm')}
      >
        <Trash2 /> Delete
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<ImportTreeDialog
  bind:this={importDialog}
  onCreated={onOpenTree}
  testid={tid?.('import')}
/>

<NewWorkspaceDialog
  bind:open={wsDialogOpen}
  onSubmit={submitWs}
  onClose={() => (wsDialogOpen = false)}
  testid={tid?.('ws')}
/>
