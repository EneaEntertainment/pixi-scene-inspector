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
    remapIdListByUid,
    resolveMarqueeSelection,
    sortIdsByTreeOrder,
    toggleSelectedId,
  } from "../multi-select";
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
    expandPathsToIds,
    filterTreeByName,
    findTreeNode,
    isTreeChanged,
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
    DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
    readLiveRefreshIntervalAttr,
    subscribeLiveRefreshInterval,
  } from "../live-refresh";
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

  const MULTI_SELECTION_TITLE = "multiple nodes selected";

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
  let selectedIds = $state<Array<string>>([]);
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
  const initialLiveRefreshInterval =
    readLiveRefreshIntervalAttr() ?? DEFAULT_LIVE_REFRESH_INTERVAL_SEC;
  let liveRefreshInterval = $state(initialLiveRefreshInterval);
  let autoRefresh = $state(initialLiveRefreshInterval > 0);
  let nameFilter = $state("");
  let selectionReveal = $state(0);
  let lastError = $state("");
  let clipboardIds = $state<Array<string>>([]);
  let lastClearedIds = $state<Array<string> | null>(null);
  let moving = $state(false);
  let dragging = $state(false);
  let showHelp = $state(false);

  const selectedId = $derived(
    selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null,
  );

  const isolateLabel = $derived.by(() => {
    if (!isolatedRootId || !tree) {
      return null;
    }

    const iso = findTreeNode(tree, isolatedRootId);

    return `isolated${iso ? `: ${iso.label || iso.typeName}` : ""} · press I again to exit`;
  });

  $effect(() => {
    if (!tree || selectedIds.length === 0) {
      selection.publish({ id: null, name: null, ids: [] });

      return;
    }

    if (selectedIds.length > 1) {
      selection.publish({
        id: selectedId,
        name: MULTI_SELECTION_TITLE,
        ids: selectedIds,
      });

      return;
    }

    const id = selectedIds[0];

    if (!id) {
      selection.publish({ id: null, name: null, ids: [] });

      return;
    }

    const node = findTreeNode(tree, id);

    selection.publish({
      id,
      name: node ? node.label || node.typeName : null,
      ids: [id],
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
        lastClearedIds = null;

        return;
      }

      const isFirstTree = tree === null;
      const prevTree = tree;
      const treeChanged = !prevTree || isTreeChanged(prevTree, result.tree);

      if (treeChanged) {
        lastClearedIds = null;
      }

      tree = result.tree;

      if (prevTree && isTreeRewrite(prevTree, result.tree)) {
        expandedIds = seedExpandedRoot(result.tree.id);
        selectedIds = [];
        isolatedRootId = null;
        clipboardIds = [];
        lastClearedIds = null;
      } else if (!didSeedExpand) {
        expandedIds = seedExpandedRoot(result.tree.id);

        didSeedExpand = true;
      } else if (prevTree) {
        const prevIdToUid = collectIdToUid(prevTree);
        const nextUidToId = collectUidToId(result.tree);
        const nextExpanded = remapIdsByUid(expandedIds, prevTree, result.tree);

        nextExpanded.add(result.tree.id);
        expandedIds = nextExpanded;

        if (selectedIds.length > 0) {
          selectedIds = remapIdListByUid(selectedIds, prevIdToUid, nextUidToId);
        }

        if (isolatedRootId) {
          isolatedRootId = remapIdByUid(
            isolatedRootId,
            prevIdToUid,
            nextUidToId,
          );
        }

        if (clipboardIds.length > 0) {
          clipboardIds = remapIdListByUid(
            clipboardIds,
            prevIdToUid,
            nextUidToId,
          );
        }
      }

      source = result.source;
      status = "ok";

      relayoutFromTree(result.tree);

      if (isFirstTree || prevTree) {
        await applySelection(selectedIds);
      }

      lastError = "";
    } catch (err) {
      status = "missing";
      lastError = err instanceof Error ? err.message : String(err);
      message = "Failed to read page context";
    }
  }

  async function applyMove(
    sourceIds: Array<string>,
    parentId: string,
    index: number | null,
  ) {
    if (!tree || moving || sourceIds.length === 0) {
      return;
    }

    const ordered = sortIdsByTreeOrder(tree, sourceIds).filter((id) =>
      canReparent(tree!, id, parentId),
    );

    if (ordered.length === 0) {
      return;
    }

    moving = true;
    try {
      const newIds = await host.moveNodes(ordered, parentId, index);

      if (!newIds || newIds.length === 0) {
        return;
      }

      moving = false;

      await refresh();

      if (tree) {
        let nextExpanded = expandedIds;

        for (const newId of newIds) {
          nextExpanded = ensureMovedParentExpanded(nextExpanded, tree, newId);
        }

        expandedIds = nextExpanded;

        relayoutFromTree(tree);
      }

      await applySelection(newIds);

      setTimeout(() => {
        void applySelection(newIds);
      }, 0);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      moving = false;
    }
  }

  function onmove(
    sourceIds: Array<string>,
    parentId: string,
    index: number | null,
  ) {
    void applyMove(sourceIds, parentId, index);
  }

  function ondragging(active: boolean) {
    dragging = active;
  }

  async function applySelection(ids: Array<string>) {
    if (ids.length > 0) {
      lastClearedIds = null;
    }

    selectedIds = ids;

    try {
      await host.selectNodes(ids);
    } catch {
      void 0;
    }
  }

  async function clearSelection() {
    if (selectedIds.length > 0) {
      lastClearedIds = [...selectedIds];
    }

    selectedIds = [];

    try {
      await host.selectNodes([]);
    } catch {
      void 0;
    }
  }

  async function restoreSelection() {
    if (!lastClearedIds || lastClearedIds.length === 0) {
      return;
    }

    await applySelection([...lastClearedIds]);
  }

  function toggleIsolate() {
    if (!tree) {
      return;
    }

    if (isolatedRootId) {
      isolatedRootId = null;
      relayoutFromTree(tree);

      return;
    }

    if (selectedIds.length !== 1) {
      return;
    }

    const id = selectedIds[0];

    if (!id) {
      return;
    }

    isolatedRootId = id;

    const next = new Set(expandedIds);

    next.add(id);

    expandedIds = next;

    relayoutFromTree(tree);
  }

  async function toggleVisible() {
    if (selectedIds.length === 0 || !tree) {
      return;
    }

    try {
      let any = false;

      for (const id of selectedIds) {
        const node = findTreeNode(tree, id);

        if (node && !canToggleTreeNodeVisible(node)) {
          continue;
        }

        const ok = await host.toggleNodeVisible(id);

        if (ok) {
          any = true;
        }
      }

      if (!any) {
        return;
      }

      await refresh();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  async function onselect(
    id: string,
    altKey: boolean,
    options: { toggleExpand?: boolean; additive?: boolean } = {},
  ) {
    const additive = options.additive === true;
    const toggleExpand = options.toggleExpand !== false;

    if (additive) {
      const next = toggleSelectedId(selectedIds, id);

      await applySelection(next);

      return;
    }

    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      expandOrCollapseSelection(altKey);

      return;
    }

    await applySelection([id]);

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

  async function onselectmany(ids: Array<string>, additive: boolean) {
    if (!tree) {
      return;
    }

    const ordered = sortIdsByTreeOrder(getViewRoot(tree), ids);
    const next = resolveMarqueeSelection(selectedIds, ordered, additive);

    if (next === null) {
      return;
    }

    await applySelection(next);
  }

  function expandOrCollapseSelection(altKey: boolean) {
    if (!tree || selectedIds.length === 0) {
      return;
    }

    const viewRoot = getViewRoot(tree);
    const next = new Set(expandedIds);
    let changed = false;

    for (const id of selectedIds) {
      const didChange = altKey
        ? collapseOneLevel(viewRoot, id, next)
        : expandOneLevel(viewRoot, id, next);

      if (didChange) {
        changed = true;
      }
    }

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

      void applySelection([nextId]);

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

    void applySelection([result.selectId]);
  }

  function onkeydown(e: KeyboardEvent) {
    const action = resolvePanelKey(e, {
      showHelp,
      selectedIds,
      clipboardIds,
      isolated: isolatedRootId !== null,
      canRestoreSelection: lastClearedIds !== null && lastClearedIds.length > 0,
    });

    if (!action) {
      return;
    }

    e.preventDefault();

    switch (action.type) {
      case "closeHelp":
        showHelp = false;
        break;

      case "clearSelection":
        void clearSelection();
        break;

      case "restoreSelection":
        void restoreSelection();
        break;

      case "copy":
        clipboardIds = tree ? sortIdsByTreeOrder(tree, action.ids) : action.ids;
        break;

      case "paste":
        void applyMove(action.sourceIds, action.parentId, null);
        break;

      case "isolate":
        toggleIsolate();
        break;

      case "toggleVisible":
        void toggleVisible();
        break;

      case "expand":
        expandOrCollapseSelection(false);
        break;

      case "collapse":
        expandOrCollapseSelection(true);
        break;

      case "navigate":
        navigate(action.key, action.toEnd);
        break;
    }
  }

  onMount(() => {
    void refresh();

    let timerId = 0;

    const restartTimer = () => {
      if (timerId !== 0) {
        clearInterval(timerId);
        timerId = 0;
      }

      if (liveRefreshInterval <= 0) {
        return;
      }

      timerId = window.setInterval(() => {
        if (autoRefresh) {
          void refresh();
        }
      }, liveRefreshInterval * 1000);
    };

    restartTimer();

    const unsubscribeLiveRefresh = subscribeLiveRefreshInterval((seconds) => {
      const wasOff = liveRefreshInterval <= 0;

      liveRefreshInterval = seconds;

      if (seconds <= 0) {
        autoRefresh = false;
      } else if (wasOff) {
        autoRefresh = true;
      }

      restartTimer();
    });

    window.addEventListener("keydown", onkeydown, true);

    return () => {
      if (timerId !== 0) {
        clearInterval(timerId);
      }

      unsubscribeLiveRefresh();
      window.removeEventListener("keydown", onkeydown, true);
    };
  });

  onDestroy(() => {
    selection.publish({ id: null, name: null, ids: [] });
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
    liveRefreshAvailable={liveRefreshInterval > 0}
    onautoRefreshChange={(value) => {
      if (liveRefreshInterval <= 0) {
        autoRefresh = false;

        return;
      }

      autoRefresh = value;
    }}
    {nameFilter}
    onnameFilterChange={(value) => {
      const wasFiltering = nameFilter.trim().length > 0;
      const nextFilter = value;
      const isFiltering = nextFilter.trim().length > 0;

      nameFilter = nextFilter;

      if (wasFiltering && !isFiltering && selectedIds.length > 0) {
        expandedIds = expandPathsToIds(expandedIds, selectedIds);
        selectionReveal += 1;
      }

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
        {selectedIds}
        revealToken={selectionReveal}
        {onselect}
        {onselectmany}
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
