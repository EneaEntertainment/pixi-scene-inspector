<script lang="ts">
  import {
    beginTreeDragGesture,
    endTreeDragGesture,
    type DropTarget,
    resolveDropTarget,
  } from "../drag-drop";
  import DragGhost from "./drag-ghost.svelte";
  import { displayLabel, fullLabel, labelColor } from "./node-label";
  import TreeNode from "./tree-node.svelte";

  import type { LaidOutNode, TreeEdge } from "../types";

  type Props = {
    nodes: Array<LaidOutNode>;
    edges: Array<TreeEdge>;
    width: number;
    height: number;
    rootId: string | null;
    selectedIds: Array<string>;
    onselect: (
      id: string,
      altKey: boolean,
      options?: { toggleExpand?: boolean; additive?: boolean },
    ) => void;
    onmove?: (
      sourceIds: Array<string>,
      parentId: string,
      index: number | null,
    ) => void;
    ondragging?: (dragging: boolean) => void;
  };

  const {
    nodes,
    edges,
    width,
    height,
    rootId,
    selectedIds,
    onselect,
    onmove,
    ondragging,
  }: Props = $props();

  type Tip = { text: string; x: number; y: number };
  let tip = $state<Tip | null>(null);
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let wrapEl: HTMLDivElement | undefined = $state();
  let svgEl: SVGSVGElement | undefined = $state();

  const DRAG_THRESHOLD = 5;

  type DragState = {
    sourceIds: Array<string>;
    label: string;
    labelColor: string;
    visible: boolean;
    width: number;
    height: number;
    grabOffsetX: number;
    grabOffsetY: number;
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
    active: boolean;
    drop: DropTarget | null;
  };

  let drag = $state<DragState | null>(null);
  let suppressClick = false;
  let suppressClickTimer: ReturnType<typeof setTimeout> | null = null;
  let activePointerId: number | null = null;
  let lastScrolledId: string | null = null;

  const selectedSet = $derived(new Set(selectedIds));
  const primarySelectedId = $derived(
    selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null,
  );

  $effect(() => {
    const id = primarySelectedId;

    if (id === null || id === undefined || !wrapEl) {
      return;
    }

    if (drag) {
      return;
    }

    if (id === lastScrolledId) {
      return;
    }

    const el = wrapEl.querySelector(`[data-node-id="${CSS.escape(id)}"]`);

    if (!(el instanceof SVGGElement)) {
      return;
    }

    lastScrolledId = id;

    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  function setDragging(active: boolean) {
    ondragging?.(active);
  }

  function updateDragFromEvent(e: PointerEvent) {
    if (!drag) {
      return;
    }

    const local = svgPoint(e);

    if (!local) {
      return;
    }

    if (!drag.active) {
      const dist = Math.hypot(local.x - drag.startX, local.y - drag.startY);

      if (dist < DRAG_THRESHOLD) {
        return;
      }

      window.getSelection()?.removeAllRanges();
      setDragging(true);

      drag = {
        ...drag,
        active: true,
        pointerX: local.x,
        pointerY: local.y,
      };
    }

    if (rootId === null || rootId === undefined) {
      return;
    }

    const drop = resolveDropTarget(
      nodes,
      rootId,
      drag.sourceIds,
      local.x,
      local.y,
      width,
    );

    drag = { ...drag, drop, pointerX: local.x, pointerY: local.y };
  }

  function armSuppressClick() {
    suppressClick = true;

    if (suppressClickTimer !== null) {
      clearTimeout(suppressClickTimer);
    }

    suppressClickTimer = setTimeout(() => {
      suppressClick = false;
      suppressClickTimer = null;
    }, 0);
  }

  function finishDrag(commit: boolean) {
    const state = drag;
    const hadGesture = state !== null;

    drag = null;
    activePointerId = null;

    window.removeEventListener("pointermove", onWindowPointerMove, true);
    window.removeEventListener("pointerup", onWindowPointerUp, true);
    window.removeEventListener("pointercancel", onWindowPointerCancel, true);
    window.removeEventListener("keydown", onWindowKeyDown, true);

    if (hadGesture) {
      endTreeDragGesture();
    }

    if (!state) {
      return;
    }

    if (!state.active) {
      setDragging(false);

      return;
    }

    setDragging(false);
    armSuppressClick();

    if (!commit || !state.drop || !onmove) {
      return;
    }

    onmove(state.sourceIds, state.drop.parentId, state.drop.index);
  }

  function onWindowPointerMove(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) {
      return;
    }

    updateDragFromEvent(e);
  }

  function onWindowPointerUp(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) {
      return;
    }

    if (e.button !== 0) {
      return;
    }

    finishDrag(true);
  }

  function onWindowPointerCancel(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) {
      return;
    }

    finishDrag(false);
  }

  function onWindowKeyDown(e: KeyboardEvent) {
    if (e.key !== "Escape") {
      return;
    }

    if (!drag) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    finishDrag(false);
  }

  $effect(() => () => {
    if (drag) {
      finishDrag(false);
    }

    if (suppressClickTimer !== null) {
      clearTimeout(suppressClickTimer);
    }
  });

  function clearTipTimers() {
    if (showTimer) {
      clearTimeout(showTimer);

      showTimer = null;
    }

    if (hideTimer) {
      clearTimeout(hideTimer);

      hideTimer = null;
    }
  }

  function hideTip() {
    clearTipTimers();

    tip = null;
  }

  $effect(() => () => hideTip());

  function onNodeEnter(node: LaidOutNode) {
    if (drag?.active) {
      return;
    }

    hideTip();

    const full = fullLabel(node);

    if (displayLabel(node) === full) {
      return;
    }

    showTimer = setTimeout(() => {
      tip = {
        text: full,
        x: node.x + node.width / 2,
        y: node.y,
      };

      hideTimer = setTimeout(() => {
        tip = null;
        hideTimer = null;
      }, 2000);

      showTimer = null;
    }, 1000);
  }

  function onNodeLeave() {
    hideTip();
  }

  function pointsAttr(points: Array<number>): string {
    const parts: Array<string> = [];

    for (let i = 0; i < points.length; i += 2) {
      parts.push(`${points[i]},${points[i + 1]}`);
    }

    return parts.join(" ");
  }

  function handleClick(e: MouseEvent, id: string) {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();

      return;
    }

    e.preventDefault();

    const additive = e.shiftKey || e.metaKey || e.ctrlKey;

    if (additive) {
      onselect(id, e.altKey, { toggleExpand: false, additive: true });

      return;
    }

    const inMultiSelection = selectedIds.length > 1 && selectedSet.has(id);
    const toggleExpand =
      e.altKey || primarySelectedId === id || inMultiSelection;

    onselect(id, e.altKey, { toggleExpand, additive: false });
  }

  function svgPoint(e: PointerEvent): { x: number; y: number } | null {
    if (!svgEl) {
      return null;
    }

    const pt = svgEl.createSVGPoint();

    pt.x = e.clientX;
    pt.y = e.clientY;

    const ctm = svgEl.getScreenCTM();

    if (!ctm) {
      return null;
    }

    const local = pt.matrixTransform(ctm.inverse());

    return { x: local.x, y: local.y };
  }

  function onNodePointerDown(e: PointerEvent, node: LaidOutNode) {
    if (e.button !== 0) {
      return;
    }

    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      return;
    }

    if (
      !onmove ||
      rootId === null ||
      rootId === undefined ||
      node.id === rootId
    ) {
      return;
    }

    const local = svgPoint(e);

    if (!local) {
      return;
    }

    hideTip();

    if (drag) {
      finishDrag(false);
    }

    activePointerId = e.pointerId;

    const movingIds =
      selectedSet.has(node.id) && selectedIds.length > 1
        ? selectedIds.filter((id) => id !== rootId)
        : [node.id];

    drag = {
      sourceIds: movingIds,
      label: displayLabel(node),
      labelColor: labelColor(node, rootId),
      visible: node.visible,
      width: node.width,
      height: node.height,
      grabOffsetX: local.x - node.x,
      grabOffsetY: local.y - node.y,
      startX: local.x,
      startY: local.y,
      pointerX: local.x,
      pointerY: local.y,
      active: false,
      drop: null,
    };

    beginTreeDragGesture();

    window.addEventListener("pointermove", onWindowPointerMove, true);
    window.addEventListener("pointerup", onWindowPointerUp, true);
    window.addEventListener("pointercancel", onWindowPointerCancel, true);
    window.addEventListener("keydown", onWindowKeyDown, true);
  }

  const dropNodeId = $derived.by(() => {
    if (!drag?.active || !drag.drop) {
      return null;
    }

    for (const v of drag.drop.visuals) {
      if (v.kind === "node") {
        return v.id;
      }
    }

    return null;
  });

  const dropGap = $derived.by(() => {
    if (!drag?.active || !drag.drop) {
      return null;
    }

    return drag.drop.visuals.find((v) => v.kind === "gap") ?? null;
  });

  const dragSourceSet = $derived.by(() => {
    if (!drag?.active) {
      return new Set<string>();
    }

    return new Set(drag.sourceIds);
  });
</script>

<div
  class="tree-wrap"
  bind:this={wrapEl}
  style:width={`${width}px`}
  style:height={`${height}px`}
  class:dragging={drag?.active}
>
  <svg
    class="tree"
    bind:this={svgEl}
    {width}
    {height}
    role="img"
    aria-label="Pixi scene inspector"
  >
    <defs>
      <pattern
        id="drop-hatch"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill="#ffe066" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#e6b800" stroke-width="3" />
      </pattern>
    </defs>

    {#each edges as edge (pointsAttr(edge.points))}
      <polyline
        points={pointsAttr(edge.points)}
        fill="none"
        stroke="#ffffff"
        stroke-width="1.5"
        stroke-linejoin="miter"
        stroke-linecap="square"
      />
    {/each}

    {#each nodes as node (node.id)}
      <TreeNode
        {node}
        display={displayLabel(node)}
        color={labelColor(node, rootId)}
        selected={selectedSet.has(node.id)}
        isDropNode={dropNodeId === node.id}
        isSource={dragSourceSet.has(node.id)}
        onclick={(e) => handleClick(e, node.id)}
        onpointerdown={(e) => onNodePointerDown(e, node)}
        onpointerenter={() => onNodeEnter(node)}
        onpointerleave={onNodeLeave}
        onkeydown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") {
            return;
          }

          e.preventDefault();
          onselect(node.id, e.altKey);
        }}
      />
    {/each}

    {#if dropGap && dropGap.kind === "gap"}
      <rect
        x={dropGap.x}
        y={dropGap.y}
        width={dropGap.width}
        height={dropGap.height}
        fill="url(#drop-hatch)"
        opacity="0.95"
        pointer-events="none"
      />
    {/if}

    {#if drag?.active}
      <DragGhost
        x={drag.pointerX - drag.grabOffsetX}
        y={drag.pointerY - drag.grabOffsetY}
        width={drag.width}
        height={drag.height}
        visible={drag.visible}
        label={drag.label}
        labelColor={drag.labelColor}
      />
    {/if}
  </svg>

  {#if tip}
    <div
      class="tip"
      style:left={`${tip.x}px`}
      style:top={`${tip.y}px`}
      role="tooltip"
    >
      {tip.text}
    </div>
  {/if}
</div>

<style>
  .tree-wrap {
    position: relative;
    flex-shrink: 0;
    -webkit-user-select: none;
    user-select: none;
  }

  .tree-wrap.dragging {
    cursor: grabbing;
  }

  .tree-wrap.dragging :global(.node) {
    cursor: grabbing;
  }

  .tree {
    display: block;
    -webkit-user-select: none;
    user-select: none;
  }

  .tip {
    position: absolute;
    z-index: 2;
    max-width: min(360px, 80vw);
    padding: 4px 8px;
    border: 1.5px solid #111111;
    border-radius: 2px;
    background: #fff8c8;
    box-shadow: 3px 3px 0 #111111;
    color: #111111;
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.3;
    overflow-wrap: anywhere;
    word-break: break-word;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 8px));
    white-space: pre-wrap;
  }
</style>
