<script lang="ts">
import type { Select as SelectPrimitive } from "bits-ui";

let { ...restProps }: SelectPrimitive.PortalProps = $props();
</script>

<SelectPrimitive.Portal {...restProps} />
