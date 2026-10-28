<script lang="ts">
  type Props = {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    label: string;
    labelColor: string;
  };

  const { x, y, width, height, visible, label, labelColor }: Props = $props();

</script>

<g transform={`translate(${x}, ${y})`} pointer-events="none">
  <rect
    x="3"
    y="3"
    {width}
    {height}
    fill="#111111"
    opacity="0.35"
  />
  <rect
    x="0"
    y="0"
    {width}
    {height}
    fill={visible ? '#ffffff' : 'rgba(255,255,255,0.45)'}
    stroke="#111111"
    stroke-width="1.5"
    opacity="0.9"
  />
  <text
    class="label"
    x={width / 2}
    y={(height / 2) + 1}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={labelColor}
    font-family="'Courier New', Courier, monospace"
    font-size="12"
    font-weight="700"
    opacity="0.9"
    pointer-events="none"
  >
    {label}
  </text>
</g>

<style>
  .label {
    -webkit-user-select: none;
    user-select: none;
    pointer-events: none;
  }
</style>
