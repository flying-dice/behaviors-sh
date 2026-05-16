<script lang="ts">
  import { makeTid } from "$lib/utils";
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import GitBranchPlus from '@lucide/svelte/icons/git-branch-plus';
  import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';

  interface Props {
    open: boolean;
    x: number;
    y: number;
    isComposite: boolean;
    isRoot: boolean;
    isRef: boolean;
    testid?: string;
    onOpenChange: (open: boolean) => void;
    onAddChild: () => void;
    onAddSibling: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onWrap: (t: 'sequence' | 'selector' | 'parallel') => void;
    onConvertToRef: () => void;
    onConvertRefToAction: () => void;
    onDelete: () => void;
  }

  let {
    open,
    x,
    y,
    isComposite,
    isRoot,
    isRef,
    testid,
    onOpenChange,
    onAddChild,
    onAddSibling,
    onMoveUp,
    onMoveDown,
    onWrap,
    onConvertToRef,
    onConvertRefToAction,
    onDelete,
  }: Props = $props();

  // Close the menu before each action so the DOM settles before the
  // structural edit rebuilds the canvas — otherwise the virtual trigger
  // keeps focus and blocks the next right-click.
  function run(action: () => void) {
    onOpenChange(false);
    queueMicrotask(action);
  }

  const tid = $derived(makeTid(testid));
</script>

<DropdownMenu.Root {open} {onOpenChange}>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <span
        {...props}
        aria-hidden="true"
        style:position="fixed"
        style:left="{x}px"
        style:top="{y}px"
        style:width="0"
        style:height="0"
        style:pointer-events="none"
      ></span>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-52" align="start" data-testid={testid}>
    <DropdownMenu.Item
      disabled={!isComposite}
      onclick={() => run(onAddChild)}
      data-testid={tid('add-child')}
    >
      <PlusIcon />
      <span>Add child</span>
    </DropdownMenu.Item>
    <DropdownMenu.Item
      disabled={isRoot}
      onclick={() => run(onAddSibling)}
      data-testid={tid('add-sibling')}
    >
      <PlusIcon />
      <span>Add sibling</span>
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <DropdownMenu.Item
      disabled={isRoot}
      onclick={() => run(onMoveUp)}
      data-testid={tid('move-up')}
    >
      <ChevronUp />
      <span>Move up</span>
    </DropdownMenu.Item>
    <DropdownMenu.Item
      disabled={isRoot}
      onclick={() => run(onMoveDown)}
      data-testid={tid('move-down')}
    >
      <ChevronDown />
      <span>Move down</span>
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger data-testid={tid('wrap')}>
        <GitBranchPlus />
        <span>Wrap in…</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent class="w-44">
        <DropdownMenu.Item
          onclick={() => run(() => onWrap('sequence'))}
          data-testid={tid('wrap-sequence')}
        >
          <span class="font-mono">sequence</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onclick={() => run(() => onWrap('selector'))}
          data-testid={tid('wrap-selector')}
        >
          <span class="font-mono">selector</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onclick={() => run(() => onWrap('parallel'))}
          data-testid={tid('wrap-parallel')}
        >
          <span class="font-mono">parallel</span>
        </DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    {#if isRef}
      <DropdownMenu.Item
        onclick={() => run(onConvertRefToAction)}
        data-testid={tid('convert-to-action')}
      >
        <RefreshCcw />
        <span>Replace with action</span>
      </DropdownMenu.Item>
    {:else}
      <DropdownMenu.Item
        onclick={() => run(onConvertToRef)}
        data-testid={tid('convert-to-link')}
      >
        <RefreshCcw />
        <span>Replace with linked tree</span>
      </DropdownMenu.Item>
    {/if}

    <DropdownMenu.Separator />

    <DropdownMenu.Item
      variant="destructive"
      onclick={() => run(onDelete)}
      data-testid={tid('delete')}
    >
      <Trash2 />
      <span>{isRoot ? 'Reset root' : 'Delete'}</span>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
