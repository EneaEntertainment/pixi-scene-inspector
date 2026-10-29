<script module lang="ts">
  declare const WATCH: boolean | undefined;

  if (typeof WATCH !== "undefined" && WATCH) {
    new EventSource("http://localhost:10809/esbuild").addEventListener(
      "change",
      () => {
        window.location.reload();
      },
    );
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { layoutTree } from "../layout";
  import {
    createSelectionChannel,
    type SelectionChannel,
  } from "../selection-channel";
  import {
    collapseOneLevel,
    depthNavTarget,
    expandOneLevel,
    levelNavTarget,
  } from "../tree-nav";
  import {
    collectIdToUid,
    collectTreeIds,
    collectUidToId,
    countTreeNodes,
    filterTreeByName,
    findTreeNode,
    isAncestorId,
    isTreeRewrite,
    remapIdByUid,
    remapIdsByUid,
  } from "../tree-ops";
  import Help from "./help.svelte";
  import MissingPixi from "./missing-pixi.svelte";
  import PanelBar from "./panel-bar.svelte";
  import { resolvePanelKey } from "./panel-keyboard";
  import {
    canReparent,
    canToggleTreeNodeVisible,
    ensureMovedParentExpanded,
    seedExpandedRoot,
  } from "./panel-session";
  import SceneTree from "./scene-tree.svelte";
  import {
    readHighlightEnabled,
    writeHighlightEnabled,
  } from "../overlay/shell/settings";
  import type { PixiTreeHost } from "../host";
  import type {
    LaidOutNode,
    SnapshotResult,
    TreeEdge,
    TreeNodeData,
  } from "../types";

  const {
    host,
    onBarReady,
    selection = createSelectionChannel(),
    setHighlightEnabled,
  }: {
    host: PixiTreeHost;
    onBarReady?: (bar: HTMLElement) => void;
    selection?: SelectionChannel;
    setHighlightEnabled?: (enabled: boolean) => void;
  } = $props();

  let expandedIds = $state<Set<string>>(new Set());
  let selectedId = $state<string | null>(null);
  let didSeedExpand = false;
  let status = $state<"loading" | "ok" | "missing">("loading");
  let message = $state("Looking for PixiJS…");
  let source = $state("");
  let tree = $state<TreeNodeData | null>(null);
  let nodes = $state<Array<LaidOutNode>>([]);
  let edges = $state<Array<TreeEdge>>([]);
  let canvasW = $state(800);
  let canvasH = $state(600);
  let isolatedRootId = $state<string | null>(null);
  let highlightEnabled = $state(readHighlightEnabled());
  let autoRefresh = $state(true);
  let nameFilter = $state("");
  let lastError = $state("");
  let clipboardId = $state<string | null>(null);
  let moving = $state(false);
  let dragging = $state(false);
  let showHelp = $state(false);

  const isolateLabel = $derived.by(() => {
    if (!isolatedRootId || !tree) {
      return null;
    }

    const iso = findTreeNode(tree, isolatedRootId);

    return `isolated${iso ? `: ${iso.label || iso.typeName}` : ""} · press I again to exit`;
  });

  $effect(() => {
    if (!selectedId || !tree) {
      selection.publish({ id: null, name: null });

      return;
    }

    const node = findTreeNode(tree, selectedId);

    selection.publish({
      id: selectedId,
      name: node ? node.label || node.typeName : null,
    });
  });

  function getViewRoot(root: TreeNodeData): TreeNodeData {
    if (!isolatedRootId) {
      return root;
    }

    return findTreeNode(root, isolatedRootId) ?? root;
  }

  function relayoutFromTree(root: TreeNodeData) {
    const viewRoot = getViewRoot(root);
    const query = nameFilter.trim();
    const filtered = query ? filterTreeByName(viewRoot, query) : viewRoot;

    if (!filtered) {
      nodes = [];
      edges = [];
      canvasW = 200;
      canvasH = 100;

      if (source) {
        message = `0 nodes · ${source}`;
      }

      return;
    }

    const expandForLayout = query ? collectTreeIds(filtered) : expandedIds;
    const laid = layoutTree(filtered, expandForLayout);

    nodes = laid.nodes;
    edges = laid.edges;
    canvasW = laid.width;
    canvasH = laid.height;

    if (source) {
      const count = query ? countTreeNodes(filtered) : countTreeNodes(root);

      message = `${count} nodes · ${source}`;
    }
  }

  export async function refresh() {
    if (moving || dragging) {
      return;
    }

    try {
      const result: SnapshotResult = await host.fetchSnapshot();

      if (!result.ok) {
        status = "missing";
        message = result.reason;
        tree = null;
        nodes = [];
        edges = [];
        isolatedRootId = null;

        return;
      }

      const isFirstTree = tree === null;
      const prevTree = tree;

      tree = result.tree;

      if (prevTree && isTreeRewrite(prevTree, result.tree)) {
        expandedIds = seedExpandedRoot(result.tree.id);
        selectedId = null;
        isolatedRootId = null;
        clipboardId = null;
      } else if (!didSeedExpand) {
        expandedIds = seedExpandedRoot(result.tree.id);

        didSeedExpand = true;
      } else if (prevTree) {
        const prevIdToUid = collectIdToUid(prevTree);
        const nextUidToId = collectUidToId(result.tree);
        const nextExpanded = remapIdsByUid(expandedIds, prevTree, result.tree);

        nextExpanded.add(result.tree.id);
        expandedIds = nextExpanded;

        if (selectedId) {
          selectedId = remapIdByUid(selectedId, prevIdToUid, nextUidToId);
        }

        if (isolatedRootId) {
          isolatedRootId = remapIdByUid(
            isolatedRootId,
            prevIdToUid,
            nextUidToId,
          );
        }

        if (clipboardId) {
          clipboardId = remapIdByUid(clipboardId, prevIdToUid, nextUidToId);
        }
      }

      source = result.source;
      status = "ok";

      relayoutFromTree(result.tree);

      if (isFirstTree && selectedId) {
        await highlight(selectedId);
      }

      lastError = "";
    } catch (err) {
      status = "missing";
      lastError = err instanceof Error ? err.message : String(err);
      message = "Failed to read page context";
    }
  }

  async function applyMove(
    sourceId: string,
    parentId: string,
    index: number | null,
  ) {
    if (!tree || moving) {
      return;
    }

    if (!canReparent(tree, sourceId, parentId)) {
      return;
    }

    moving = true;
    try {
      const newId = await host.moveNode(sourceId, parentId, index);

      if (newId === null || newId === undefined) {
        return;
      }

      if (
        clipboardId &&
        clipboardId !== sourceId &&
        isAncestorId(sourceId, clipboardId)
      ) {
        clipboardId = null;
      }

      moving = false;

      await refresh();

      if (tree) {
        expandedIds = ensureMovedParentExpanded(expandedIds, tree, newId);

        relayoutFromTree(tree);
      }

      await highlight(newId);

      setTimeout(() => {
        void highlight(newId);
      }, 0);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      moving = false;
    }
  }

  function onmove(sourceId: string, parentId: string, index: number | null) {
    void applyMove(sourceId, parentId, index);
  }

  function ondragging(active: boolean) {
    dragging = active;
  }

  async function highlight(id: string) {
    selectedId = id;

    try {
      await host.selectNode(id);
    } catch {
      void 0;
    }
  }

  function toggleIsolate() {
    if (!tree || !selectedId) {
      return;
    }

    if (isolatedRootId) {
      isolatedRootId = null;
    } else {
      isolatedRootId = selectedId;

      const next = new Set(expandedIds);

      next.add(selectedId);

      expandedIds = next;
    }

    relayoutFromTree(tree);
  }

  async function toggleVisible() {
    if (!selectedId || !tree) {
      return;
    }

    const selected = findTreeNode(tree, selectedId);

    if (selected && !canToggleTreeNodeVisible(selected)) {
      return;
    }

    try {
      const ok = await host.toggleNodeVisible(selectedId);

      if (!ok) {
        return;
      }

      await refresh();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  async function onselect(id: string, altKey: boolean, toggleExpand = true) {
    await highlight(id);

    if (!toggleExpand || !tree) {
      return;
    }

    const viewRoot = getViewRoot(tree);
    const next = new Set(expandedIds);

    const changed = altKey
      ? collapseOneLevel(viewRoot, id, next)
      : expandOneLevel(viewRoot, id, next);

    if (changed) {
      expandedIds = next;
      relayoutFromTree(tree);
    }
  }

  function navigate(
    key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
    toEnd: boolean,
  ) {
    if (!selectedId) {
      return;
    }

    if (key === "ArrowLeft" || key === "ArrowRight") {
      const nextId = levelNavTarget(nodes, selectedId, key, toEnd);

      if (nextId === null || nextId === undefined) {
        return;
      }

      void highlight(nextId);

      return;
    }

    if (!tree) {
      return;
    }

    const viewRoot = getViewRoot(tree);

    const result = depthNavTarget(
      viewRoot,
      nodes,
      expandedIds,
      selectedId,
      key,
      toEnd,
    );

    if (result === null || result === undefined) {
      return;
    }

    if (result.expandAlong.length > 0) {
      const next = new Set(expandedIds);

      for (const id of result.expandAlong) {
        next.add(id);
      }

      expandedIds = next;

      relayoutFromTree(tree);
    }

    void highlight(result.selectId);
  }

  function onkeydown(e: KeyboardEvent) {
    const action = resolvePanelKey(e, {
      showHelp,
      selectedId,
      clipboardId,
    });

    if (!action) {
      return;
    }

    e.preventDefault();

    switch (action.type) {
      case "closeHelp":
        showHelp = false;
        break;

      case "copy":
        clipboardId = action.id;
        break;

      case "paste":
        void applyMove(action.sourceId, action.parentId, null);
        break;

      case "isolate":
        toggleIsolate();
        break;

      case "toggleVisible":
        void toggleVisible();
        break;

      case "expand":
        if (selectedId) {
          void onselect(selectedId, false);
        }

        break;

      case "collapse":
        if (selectedId) {
          void onselect(selectedId, true);
        }

        break;

      case "navigate":
        navigate(action.key, action.toEnd);
        break;
    }
  }

  onMount(() => {
    void refresh();

    const id = setInterval(() => {
      if (autoRefresh) {
        void refresh();
      }
    }, 1000);

    window.addEventListener("keydown", onkeydown, true);

    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onkeydown, true);
    };
  });

  onDestroy(() => {
    selection.publish({ id: null, name: null });
  });
</script>

<div class="shell">
  <PanelBar
    {message}
    {source}
    {showHelp}
    {isolateLabel}
    {highlightEnabled}
    onhighlightEnabledChange={(value) => {
      highlightEnabled = value;

      writeHighlightEnabled(value);
      setHighlightEnabled?.(value);
    }}
    {autoRefresh}
    onautoRefreshChange={(value) => {
      autoRefresh = value;
    }}
    {nameFilter}
    onnameFilterChange={(value) => {
      nameFilter = value;

      if (tree) {
        relayoutFromTree(tree);
      }
    }}
    ontoggleHelp={() => {
      showHelp = !showHelp;
    }}
    onrefresh={() => {
      refresh().catch(() => undefined);
    }}
    {onBarReady}
  />

  {#if showHelp}
    <Help
      onclose={() => {
        showHelp = false;
      }}
    />
  {:else if status === "missing"}
    <MissingPixi {message} {lastError} />
  {:else if status === "loading"}
    <div class="empty"><p>Loading…</p></div>
  {:else}
    <div class="viewport">
      <SceneTree
        {nodes}
        {edges}
        width={canvasW}
        height={canvasH}
        rootId={tree ? getViewRoot(tree).id : null}
        {selectedId}
        {onselect}
        {onmove}
        {ondragging}
      />
    </div>
  {/if}
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  .shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    font-family: "Courier New", Courier, monospace;
    color: #f0f0f0;
    background: #4a4a4a;
  }

  .viewport {
    flex: 1;
    overflow: auto;
    -webkit-user-select: none;
    user-select: none;
    background: linear-gradient(90deg, rgb(0 0 0 / 6%) 1px, transparent 1px),
      linear-gradient(rgb(0 0 0 / 6%) 1px, transparent 1px), #4a4a4a;
    background-size: 16px 16px;
  }

  .empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    justify-content: center;
    padding: 32px;
    max-width: 560px;
  }

  .empty p {
    margin: 0;
    line-height: 1.4;
  }
</style>
