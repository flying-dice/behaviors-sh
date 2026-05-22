<script lang="ts">
import { classifyStatus, STATUS_CLASSES, STATUS_DOT } from "../format";

interface Props {
	status: string;
	testid?: string;
}
let { status, testid }: Props = $props();

const kind = $derived(classifyStatus(status));
</script>

<span
  data-testid={testid}
  class={[
    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset',
    STATUS_CLASSES[kind],
  ].join(' ')}
>
  <span class={['size-1.5 rounded-full', STATUS_DOT[kind]].join(' ')} aria-hidden="true"
  ></span>
  {status}
</span>
