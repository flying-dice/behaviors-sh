<script lang="ts">
  import { makeTid } from "$lib/utils";
  import type { BehaviourNode } from '@behaviors-ui/behavior-spec';
  import * as ws from '$lib/workspace/store.svelte';
  import BehaviourCanvas from './components/BehaviourCanvas.svelte';
  import BehaviourCanvasToolbar from './components/BehaviourCanvasToolbar.svelte';
  import BehaviourLeftRail from './components/BehaviourLeftRail.svelte';
  import BehaviourInspector from './components/BehaviourInspector.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import BehaviourStatusBar from './components/BehaviourStatusBar.svelte';
  import CanvasNodeMenu from './components/CanvasNodeMenu.svelte';
  import { ZOOM_FIT_MAX, ZOOM_MIN, computeLayout, countNodes } from './behaviour-layout';
  import { nodeToYaml } from './behaviour-yaml';
  import { dereferenceTree } from './dereference';
  import {
    type Path,
    addStep,
    defaultAction,
    getAt,
    insertChild,
    move,
    moveStep,
    parentOf,
    removeAt,
    removeStep,
    setCompositeType,
    setDescription,
    setName,
    setRef,
    setRetries,
    setStepBody,
    updateAt,
    wrap,
  type CompositeType,
  } from './tree-ops';

  interface Props {
    treeId: string;
    onBack: () => void;
    onSwitchTree: (id: string) => void;
    testid?: string;
  }
  let { treeId, onBack, onSwitchTree, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let selected = $state<Path | null>(null);
  let pan = $state({ x: 32, y: 16 });
  let zoom = $state(0.85);
  let canvasWrap = $state<HTMLDivElement | null>(null);

  const DOCK_MIN = 320;
  let dockWidth = $state(Math.max(DOCK_MIN, Math.round(window.innerWidth * 0.25)));
  let dragging = $state(false);

  function onResizeStart(e: PointerEvent) {
    dragging = true;
    const startX = e.clientX;
    const startW = dockWidth;
    const onMove = (ev: PointerEvent) => {
      const delta = startX - ev.clientX;
      dockWidth = Math.max(DOCK_MIN, startW + delta);
    };
    const onUp = () => {
      dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  let menuOpen = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);

  function openContextMenu(_path: Path, x: number, y: number) {
    menuX = x;
    menuY = y;
    menuOpen = true;
  }

  const workspace = $derived(ws.getWorkspace());
  const root = $derived(ws.getTree(treeId));
  const trees = $derived(ws.listTrees());
  const dirty = $derived(ws.isDirty());

  $effect(() => {
    if (!root) onBack();
  });

  // Snap selection back to null if a structural edit invalidated the path.
  $effect(() => {
    if (!root || selected == null) return;
    try {
      getAt(root, selected);
    } catch {
      selected = null;
    }
  });

  const selectedNode = $derived.by<BehaviourNode | null>(() => {
    if (!root || selected == null) return null;
    try {
      return getAt(root, selected);
    } catch {
      return null;
    }
  });

  // YAML for the right-hand panel is the *dereferenced* tree, so copying
  // it gives a self-contained snippet. We resolve internal `$ref`s via
  // @apidevtools/json-schema-ref-parser, then serialise. Until the async
  // dereference completes, the raw tree YAML stands in.
  let yaml = $state('');
  $effect(() => {
    const ws = workspace;
    const tree = root;
    if (!ws || !tree) {
      yaml = '';
      return;
    }
    yaml = nodeToYaml(tree);
    let cancelled = false;
    dereferenceTree(ws, treeId).then((deref) => {
      if (cancelled) return;
      yaml = nodeToYaml(deref ?? tree);
    });
    return () => {
      cancelled = true;
    };
  });
  const nodeCount = $derived(root ? countNodes(root) : 0);
  const isComposite = $derived.by(() => {
    const n = selectedNode;
    return !!n && !('$ref' in n) && n.type !== 'action';
  });
  const isRef = $derived.by(() => !!selectedNode && '$ref' in selectedNode);
  const isRoot = $derived(selected != null && selected.length === 0);

  function apply(transform: (r: BehaviourNode) => BehaviourNode) {
    if (!root) return;
    try {
      ws.replaceTree(treeId, transform(root));
    } catch (err) {
      console.error(err);
    }
  }

  function patchSelected(fn: (node: BehaviourNode) => BehaviourNode) {
    if (selected == null) return;
    apply((r) => updateAt(r, selected!, fn));
  }

  function onSetName(v: string) { patchSelected((n) => setName(n, v)); }
  function onSetDescription(v: string) { patchSelected((n) => setDescription(n, v)); }
  function onSetRetries(v: string) { patchSelected((n) => setRetries(n, v)); }
  function onSetCompositeType(v: CompositeType) { patchSelected((n) => setCompositeType(n, v)); }
  function onSetRef(v: string) { patchSelected((n) => setRef(n, v)); }
  function onAddStep(kind: 'evaluate' | 'instruct') { patchSelected((n) => addStep(n, kind)); }
  function onRemoveStep(idx: number) { patchSelected((n) => removeStep(n, idx)); }
  function onMoveStep(from: number, to: number) { patchSelected((n) => moveStep(n, from, to)); }
  function onSetStepBody(idx: number, value: string) { patchSelected((n) => setStepBody(n, idx, value)); }

  function onWrap(type: CompositeType) {
    if (!selectedNode || selected == null) return;
    const wrapperName =
      'name' in selectedNode ? `${selectedNode.name}-wrapper` : 'wrapper';
    apply((r) => wrap(r, selected!, type, wrapperName));
    selected = [...selected, 0];
  }

  function onConvertToRef() {
    patchSelected(() => ({ $ref: '' }));
  }

  function onConvertRefToAction() {
    patchSelected(() => defaultAction('step'));
  }

  function switchToTree(id: string) {
    selected = null;
    onSwitchTree(id);
  }

  // ---- Structural toolbar (canvas-area buttons) ------------------------

  function onAddChild() {
    if (!isComposite || selected == null) return;
    apply((r) => insertChild(r, selected!, defaultAction()));
  }

  function onAddSibling() {
    if (isRoot || selected == null) return;
    const parent = parentOf(selected)!;
    const idx = selected[selected.length - 1]! + 1;
    apply((r) => insertChild(r, parent, defaultAction(), idx));
  }

  function onDeleteSelected() {
    if (selected == null) return;
    if (isRoot) {
      apply(() => defaultAction(treeId));
      selected = null;
      return;
    }
    const parent = parentOf(selected)!;
    apply((r) => removeAt(r, selected!));
    selected = parent;
  }

  function onMoveSelected(direction: -1 | 1) {
    if (isRoot || selected == null) return;
    apply((r) => move(r, selected!, direction));
    const last = selected![selected!.length - 1]!;
    selected = [...parentOf(selected!)!, last + direction];
  }

  // Frame the entire tree inside the canvas viewport. Used by the Fit
  // toolbar button, by the initial mount, and whenever the user switches
  // to a different tree.
  function onFit() {
    if (!root || !canvasWrap) return;
    const layout = computeLayout(root);
    const vw = canvasWrap.clientWidth;
    const vh = canvasWrap.clientHeight;
    if (!vw || !vh || !layout.width || !layout.height) return;
    const padding = 48;
    const zx = (vw - padding * 2) / layout.width;
    const zy = (vh - padding * 2) / layout.height;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_FIT_MAX, Math.min(zx, zy)));
    const contentW = layout.width * newZoom;
    const contentH = layout.height * newZoom;
    zoom = newZoom;
    pan = {
      x: (vw - contentW) / 2,
      y: (vh - contentH) / 2,
    };
  }

  // Auto-fit when entering this editor or switching trees. We intentionally
  // depend on `treeId` only — not on the workspace root — so refitting
  // doesn't fight the user's manual pan/zoom after every edit.
  $effect(() => {
    void treeId;
    queueMicrotask(onFit);
  });
</script>

{#if !root || !workspace}
  <div class="grid h-full place-items-center text-sm text-muted-foreground">
    Tree not found.
  </div>
{:else}
  <div
    data-testid={testid}
    class="grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden"
    class:select-none={dragging}
    style:grid-template-columns={selected != null ? `248px 1fr 8px ${dockWidth}px` : '248px 1fr'}
  >
    <div class="col-span-full">
      <BehaviourCanvasToolbar
        testid={tid('toolbar')}
        {treeId}
        treeName={'name' in root ? root.name : treeId}
        {zoom}
        {yaml}
        valid={true}
        onZoom={(z) => (zoom = z)}
        {onFit}
      />
    </div>

    <BehaviourLeftRail
      testid={tid('left-rail')}
      workspaceName={workspace.name}
      {trees}
      currentTreeId={treeId}
      {root}
      {selected}
      onSwitchTree={switchToTree}
      {onBack}
      onSelect={(p) => (selected = p)}
    />

    <div bind:this={canvasWrap} class="relative flex min-h-0 flex-col">
      <div
        data-testid={tid('canvas-actions')}
        class="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border bg-card/95 p-1 shadow-sm backdrop-blur"
      >
        <button
          type="button"
          data-testid={tid('canvas-add-child')}
          class="rounded px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={selected == null || !isComposite}
          onclick={onAddChild}
          title="Add child action under selected composite"
        >
          + child
        </button>
        <button
          type="button"
          data-testid={tid('canvas-add-sibling')}
          class="rounded px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={selected == null || isRoot}
          onclick={onAddSibling}
          title="Add sibling after selected"
        >
          + sibling
        </button>
        <div class="mx-1 h-4 w-px bg-border"></div>
        <button
          type="button"
          data-testid={tid('canvas-move-up')}
          class="rounded px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={selected == null || isRoot}
          onclick={() => onMoveSelected(-1)}
          title="Move up among siblings"
        >
          ↑
        </button>
        <button
          type="button"
          data-testid={tid('canvas-move-down')}
          class="rounded px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={selected == null || isRoot}
          onclick={() => onMoveSelected(1)}
          title="Move down among siblings"
        >
          ↓
        </button>
        <div class="mx-1 h-4 w-px bg-border"></div>
        <button
          type="button"
          data-testid={tid('canvas-delete')}
          class="rounded px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
          disabled={selected == null}
          onclick={onDeleteSelected}
          title={isRoot ? 'Replace root with a fresh action' : 'Delete selected'}
        >
          delete
        </button>
      </div>

      <BehaviourCanvas
        testid={tid('canvas')}
        {root}
        {selected}
        {pan}
        {zoom}
        {trees}
        onSelect={(p) => (selected = p)}
        onPan={(p) => (pan = p)}
        onZoom={(z) => (zoom = z)}
        onContextMenu={openContextMenu}
        onOpenLinkedTree={switchToTree}
      />
    </div>

    <CanvasNodeMenu
      open={menuOpen}
      x={menuX}
      y={menuY}
      testid={tid('node-menu')}
      {isComposite}
      {isRoot}
      {isRef}
      onOpenChange={(o) => (menuOpen = o)}
      onAddChild={onAddChild}
      onAddSibling={onAddSibling}
      onMoveUp={() => onMoveSelected(-1)}
      onMoveDown={() => onMoveSelected(1)}
      {onWrap}
      {onConvertToRef}
      {onConvertRefToAction}
      onDelete={onDeleteSelected}
    />

    {#if selected != null}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        data-testid={tid('dock-resize-handle')}
        class="cursor-col-resize transition-colors hover:bg-primary/40 {dragging ? 'bg-primary/40' : ''}"
        role="separator"
        aria-orientation="vertical"
        onpointerdown={onResizeStart}
      ></div>

      <aside data-testid={tid('right-dock')} class="flex min-h-0 flex-col border-l bg-card">
        <div class="min-h-0 flex-1">
          <ScrollArea class="h-full">
            <div class="p-4">
              <BehaviourInspector
                testid={tid('right-dock-inspector')}
                node={selectedNode}
                {trees}
                currentTreeId={treeId}
                {onSetName}
                {onSetDescription}
                {onSetRetries}
                {onSetCompositeType}
                {onSetRef}
                {onAddStep}
                {onRemoveStep}
                {onMoveStep}
                {onSetStepBody}
                {onWrap}
                {onConvertToRef}
                {onConvertRefToAction}
                onOpenLinkedTree={switchToTree}
              />
            </div>
          </ScrollArea>
        </div>
      </aside>
    {/if}

    <div class="col-span-full">
      <BehaviourStatusBar
        testid={tid('status-bar')}
        workspaceName={workspace.name}
        {nodeCount}
        {selected}
        {zoom}
        {dirty}
      />
    </div>
  </div>
{/if}
