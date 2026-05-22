<script lang="ts">
import { resolveRef, tokenizeText } from "../scope";
import ScopeRefBadge from "./ScopeRefBadge.svelte";

interface Props {
	text: string;
	varScope: Record<string, unknown>;
	constScope: Record<string, unknown>;
	testid?: string;
}
let { text, varScope, constScope, testid }: Props = $props();

const tokens = $derived(tokenizeText(text));
</script>

{#if tokens.length === 0}{:else}<span data-testid={testid}
  >{#each tokens as token, i (i)}{#if token.kind === 'text'}{token.text}{:else}{@const resolved = resolveRef(token.ref, varScope, constScope)}<ScopeRefBadge
        ref={token.ref}
        exists={resolved.exists}
        value={resolved.value}
      />{/if}{/each}</span
>{/if}
