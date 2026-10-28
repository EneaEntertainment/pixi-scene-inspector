<script lang="ts">
  import type { LaidOutNode } from '../types';

  type Props = {
    node: LaidOutNode;
    display: string;
    color: string;
    selected: boolean;
    isDropNode: boolean;
    isSource: boolean;
    onclick: (e: MouseEvent) => void;
    onpointerdown: (e: PointerEvent) => void;
    onpointerenter: () => void;
    onpointerleave: () => void;
    onkeydown: (e: KeyboardEvent) => void;
  };

  const {
      node,
      display,
      color,
      selected,
      isDropNode,
      isSource,
      onclick,
      onpointerdown,
      onpointerenter,
      onpointerleave,
      onkeydown,
  }: Props = $props();

  const fill = $derived.by(() =>
  {
      if (node.filterMatch)
      {
          return node.visible ? '#d8f5d0' : 'rgba(216,245,208,0.45)';
      }

      return node.visible ? '#ffffff' : 'rgba(255,255,255,0.45)';
  });

</script>

<g
  class="node"
  class:drag-source={isSource}
  data-node-id={node.id}
  transform={`translate(${node.x}, ${node.y})`}
  role="button"
  tabindex="-1"
  {onclick}
  onmousedown={(e) =>
  {
      e.preventDefault();
      const active = document.activeElement;

      if (active instanceof HTMLElement)
      {
          active.blur();
      }
  }}
  {onpointerdown}
  {onkeydown}
  {onpointerenter}
  {onpointerleave}
>
  <rect
    x="3"
    y="3"
    width={node.width}
    height={node.height}
    fill="#111111"
    opacity={node.visible ? 1 : 0.35}
  />
  <rect
    class="box"
    x="0"
    y="0"
    width={node.width}
    height={node.height}
    fill={fill}
    stroke="#111111"
    stroke-width="1.5"
  />
  {#if selected}
    <rect
      x="-4"
      y="-4"
      width={node.width + 8}
      height={node.height + 8}
      fill="none"
      stroke="#ffffff"
      stroke-width="2"
    />
    <rect
      x="-2"
      y="-2"
      width={node.width + 4}
      height={node.height + 4}
      fill="none"
      stroke="#111111"
      stroke-width="1.5"
    />
  {/if}
  {#if isDropNode}
    <rect
      x="-5"
      y="-5"
      width={node.width + 10}
      height={node.height + 10}
      fill="url(#drop-hatch)"
      pointer-events="none"
    />
  {/if}
  <text
    class="label"
    x={node.width / 2}
    y={(node.height / 2) + 1}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={color}
    font-family="'Courier New', Courier, monospace"
    font-size="12"
    font-weight="700"
    pointer-events="none"
  >
    {display}
  </text>
</g>

<style>
  .label {
    -webkit-user-select: none;
    user-select: none;
    pointer-events: none;
  }

  .node {
    cursor: grab;
    outline: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .node.drag-source {
    opacity: 0.35;
  }
</style>
