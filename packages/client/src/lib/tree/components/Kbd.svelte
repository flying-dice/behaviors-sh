<script lang="ts">
  let { children, testid }: { children: any; testid?: string } = $props();
</script>

<kbd
  data-testid={testid}
  class="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
>
  {@render children?.()}
</kbd>
