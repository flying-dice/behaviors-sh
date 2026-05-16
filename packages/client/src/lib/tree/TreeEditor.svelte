<script lang="ts">
  import { makeTid } from "$lib/utils";
  import { stepKind, type BehaviourNode } from '@behaviors-ui/behavior-spec';
  import * as ws from '$lib/workspace/store.svelte';
  import BehaviourCanvas from './components/BehaviourCanvas.svelte';
  import BehaviourCanvasToolbar from './components/BehaviourCanvasToolbar.svelte';
  import BehaviourLeftRail from './components/BehaviourLeftRail.svelte';
  import BehaviourRightDock from './components/BehaviourRightDock.svelte';
  import BehaviourStatusBar from './components/BehaviourStatusBar.svelte';
  import CanvasNodeMenu from './components/CanvasNodeMenu.svelte';
  import { ZOOM_FIT_MAX, ZOOM_MIN, computeLayout, countNodes } from './behaviour-layout';
  import { nodeToYaml } from './behaviour-yaml';
  import { dereferenceTree } from './dereference';
  import {
    type Path,
    defaultAction,
    getAt,
    insertChild,
    move,
    parentOf,
    removeAt,
    updateAt,
    wrap,
  } from './tree-ops';

  interface Props {
    treeId: string;
    onBack: () => void;
    onSwitchTree: (id: string) => void;
    testid?: string;
  }
  let { treeId, onBack, onSwitchTree, testid }: Props = $props();
  const tid = $derived(makeTid(testid));

  let selected = $state<Path>([]);
  let inspectorTab = $state<'inspector' | 'yaml'>('inspector');
  let pan = $state({ x: 32, y: 16 });
  let zoom = $state(0.85);
  let canvasWrap = $state<HTMLDivElement | null>(null);

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

  // Snap selection back to root if a structural edit invalidated the path.
  $effect(() => {
    if (!root) return;
    try {
      getAt(root, selected);
    } catch {
      selected = [];
    }
  });

  const selectedNode = $derived.by<BehaviourNode | null>(() => {
    if (!root) return null;
    try {
      return getAt(root, selected);
    } catch {
      return root;
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
  const isRoot = $derived(selected.length === 0);

  function apply(transform: (r: BehaviourNode) => BehaviourNode) {
    if (!root) return;
    try {
      ws.replaceTree(treeId, transform(root));
    } catch (err) {
      console.error(err);
    }
  }

  function patchSelected(fn: (node: BehaviourNode) => BehaviourNode) {
    apply((r) => updateAt(r, selected, fn));
  }

  // ---- Inspector handlers ----------------------------------------------

  function onSetName(name: string) {
    patchSelected((n) => ('$ref' in n ? n : { ...n, name }));
  }

  function onSetDescription(description: string) {
    patchSelected((n) =>
      '$ref' in n ? n : { ...n, description: description.trim() || undefined },
    );
  }

  function onSetRetries(text: string) {
    patchSelected((n) => {
      if ('$ref' in n) return n;
      const trimmed = text.trim();
      if (!trimmed) return { ...n, retries: undefined };
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1) return n;
      return { ...n, retries: parsed };
    });
  }

  function onSetCompositeType(type: 'sequence' | 'selector' | 'parallel') {
    patchSelected((n) =>
      '$ref' in n || n.type === 'action' ? n : { ...n, type },
    );
  }

  function onSetRef(value: string) {
    patchSelected((n) => ('$ref' in n ? { $ref: value } : n));
  }

  function onAddStep(kind: 'evaluate' | 'instruct') {
    patchSelected((n) => {
      if ('$ref' in n || n.type !== 'action') return n;
      const seed =
        kind === 'evaluate'
          ? { evaluate: 'true' }
          : { instruct: 'TODO: describe step.' };
      return { ...n, steps: [...n.steps, seed] };
    });
  }

  function onRemoveStep(idx: number) {
    patchSelected((n) => {
      if ('$ref' in n || n.type !== 'action') return n;
      if (n.steps.length <= 1) return n;
      const steps = n.steps.slice();
      steps.splice(idx, 1);
      return { ...n, steps };
    });
  }

  function onSetStepBody(idx: number, value: string) {
    patchSelected((n) => {
      if ('$ref' in n || n.type !== 'action') return n;
      const steps = n.steps.slice();
      const current = steps[idx]!;
      const kind = stepKind(current);
      steps[idx] = { [kind]: value } as typeof current;
      return { ...n, steps };
    });
  }

  function onWrap(type: 'sequence' | 'selector' | 'parallel') {
    if (!selectedNode) return;
    const wrapperName =
      'name' in selectedNode ? `${selectedNode.name}-wrapper` : 'wrapper';
    apply((r) => wrap(r, selected, type, wrapperName));
    selected = [...selected, 0];
  }

  function onConvertToRef() {
    patchSelected(() => ({ $ref: '' }));
  }

  function onConvertRefToAction() {
    patchSelected(() => defaultAction('step'));
  }

  // ---- Structural toolbar (canvas-area buttons) ------------------------

  function onAddChild() {
    if (!isComposite) return;
    apply((r) => insertChild(r, selected, defaultAction()));
  }

  function onAddSibling() {
    if (isRoot) return;
    const parent = parentOf(selected)!;
    const idx = selected[selected.length - 1]! + 1;
    apply((r) => insertChild(r, parent, defaultAction(), idx));
  }

  function onDeleteSelected() {
    if (isRoot) {
      apply(() => defaultAction(treeId));
      selected = [];
      return;
    }
    const parent = parentOf(selected)!;
    apply((r) => removeAt(r, selected));
    selected = parent;
  }

  function onMoveSelected(direction: -1 | 1) {
    if (isRoot) return;
    apply((r) => move(r, selected, direction));
    const last = selected[selected.length - 1]!;
    selected = [...parentOf(selected)!, last + direction];
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
    class="grid h-full min-h-0 grid-cols-[248px_1fr_380px] grid-rows-[auto_1fr_auto] overflow-hidden"
  >
    <div class="col-span-3">
      <BehaviourCanvasToolbar
        testid={tid('toolbar')}
        {treeId}
        treeName={'name' in root ? root.name : treeId}
        {zoom}
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
      onSwitchTree={(id) => {
        selected = [];
        onSwitchTree(id);
      }}
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
          disabled={!isComposite}
          onclick={onAddChild}
          title="Add child action under selected composite"
        >
          + child
        </button>
        <button
          type="button"
          data-testid={tid('canvas-add-sibling')}
          class="rounded px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={isRoot}
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
          disabled={isRoot}
          onclick={() => onMoveSelected(-1)}
          title="Move up among siblings"
        >
          ↑
        </button>
        <button
          type="button"
          data-testid={tid('canvas-move-down')}
          class="rounded px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={isRoot}
          onclick={() => onMoveSelected(1)}
          title="Move down among siblings"
        >
          ↓
        </button>
        <div class="mx-1 h-4 w-px bg-border"></div>
        <button
          type="button"
          data-testid={tid('canvas-delete')}
          class="rounded px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10"
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
        onOpenLinkedTree={(id) => {
          selected = [];
          onSwitchTree(id);
        }}
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

    <BehaviourRightDock
      testid={tid('right-dock')}
      tab={inspectorTab}
      onTabChange={(t) => (inspectorTab = t)}
      node={selectedNode}
      {yaml}
      {trees}
      currentTreeId={treeId}
      {onSetName}
      {onSetDescription}
      {onSetRetries}
      {onSetCompositeType}
      {onSetRef}
      {onAddStep}
      {onRemoveStep}
      {onSetStepBody}
      {onWrap}
      {onConvertToRef}
      {onConvertRefToAction}
      onOpenLinkedTree={(id) => {
        selected = [];
        onSwitchTree(id);
      }}
    />

    <div class="col-span-3">
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
