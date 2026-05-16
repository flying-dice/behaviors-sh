<script lang="ts">
  interface Props {
    count: number;
    treeId: string;
    testid?: string;
  }
  let { count, treeId, testid }: Props = $props();
</script>

{#if count > 0}
  <p
    class="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300"
    data-testid={testid}
  >
    {count} other tree{count === 1 ? '' : 's'}
    link{count === 1 ? 's' : ''} to <span class="font-mono">{treeId}</span>
    and will be left dangling.
  </p>
{/if}
