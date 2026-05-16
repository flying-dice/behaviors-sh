<script lang="ts">
  interface Props {
    size?: number;
    stroke?: number;
    color?: string;
    class?: string;
    testid?: string;
  }
  let {
    size = 22,
    stroke = 2.5,
    color = 'currentColor',
    class: className = '',
    testid,
  }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 64 64"
  fill="none"
  stroke-width={stroke}
  stroke-linecap="square"
  stroke-linejoin="miter"
  class={className}
  style="color: {color}"
  data-testid={testid}
>
  <g stroke="currentColor">
    <rect x="26" y="6" width="12" height="12" />
    <rect x="6" y="30" width="12" height="12" />
    <rect x="46" y="30" width="12" height="12" />
    <rect x="20" y="50" width="10" height="10" />
    <rect x="34" y="50" width="10" height="10" />
    <path d="M32 18 V24 H12 V30" />
    <path d="M32 24 H52 V30" />
    <path d="M52 42 V46 H39 V50" />
    <path d="M12 42 V46 H25 V50" />
  </g>
</svg>
