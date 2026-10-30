<script lang="ts">
  import { onMount } from "svelte";
  import { layoutTree } from "../src/layout";
  import {
    remapIdListByUid,
    sortIdsByTreeOrder,
    toggleSelectedId,
  } from "../src/multi-select";
  import { resolvePanelKey } from "../src/panel/panel-keyboard";
  import {
    canReparent,
    expandedIdsAfterMove,
  } from "../src/panel/panel-session";
  import SceneTree from "../src/panel/scene-tree.svelte";
  import {
    collapseOneLevel,
    depthNavTarget,
    expandOneLevel,
    levelNavTarget,
  } from "../src/tree-nav";
  import {
    collectIdToUid,
    collectUidToId,
    findTreeNode,
    isAncestorId,
    remapIdByUid,
  } from "../src/tree-ops";
  import { moveNodesInTree, toggleVisibleInTree } from "./tree-mutators";

  import type { TreeNodeData } from "../src/types";

  type TreeDraft = {
    id: string;
    label: string;
    typeName: string;
    visible: boolean;
    children: Array<TreeDraft>;
  };

  function withUids(
    draft: TreeDraft,
    nextUid: { n: number } = { n: 1 },
  ): TreeNodeData {
    return {
      id: draft.id,
      uid: nextUid.n++,
      label: draft.label,
      typeName: draft.typeName,
      visible: draft.visible,
      children: draft.children.map((child) => withUids(child, nextUid)),
    };
  }

  const initial = withUids({
    id: "0",
    label: "db",
    typeName: "Container",
    visible: true,
    children: [
      {
        id: "0.0",
        label: "g1",
        typeName: "Container",
        visible: true,
        children: [
          {
            id: "0.0.0",
            label: "House",
            typeName: "Container",
            visible: true,
            children: [
              {
                id: "0.0.0.0",
                label: "Foundat",
                typeName: "Graphics",
                visible: true,
                children: [
                  {
                    id: "0.0.0.0.0",
                    label: "",
                    typeName: "Graphics",
                    visible: true,
                    children: [],
                  },
                ],
              },
              {
                id: "0.0.0.1",
                label: "Walls",
                typeName: "Graphics",
                visible: true,
                children: [
                  {
                    id: "0.0.0.1.0",
                    label: "",
                    typeName: "Sprite",
                    visible: true,
                    children: [],
                  },
                ],
              },
              {
                id: "0.0.0.2",
                label: "Roof",
                typeName: "Graphics",
                visible: true,
                children: [
                  {
                    id: "0.0.0.2.0",
                    label: "",
                    typeName: "AnimatedSprite",
                    visible: true,
                    children: [],
                  },
                ],
              },
              {
                id: "0.0.0.3",
                label: "Porch",
                typeName: "Graphics",
                visible: true,
                children: [
                  {
                    id: "0.0.0.3.0",
                    label: "",
                    typeName: "TilingSprite",
                    visible: true,
                    children: [],
                  },
                ],
              },
              {
                id: "0.0.0.4",
                label: "Chimney",
                typeName: "Graphics",
                visible: true,
                children: [
                  {
                    id: "0.0.0.4.0",
                    label: "",
                    typeName: "NineSliceSprite",
                    visible: true,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "0.1",
        label: "",
        typeName: "Container",
        visible: false,
        children: [
          {
            id: "0.1.0",
            label: "ThisIsReallyLongNodeLabelForTestingFullHintAndPropsTitle",
            typeName: "Text",
            visible: true,
            children: [],
          },
          {
            id: "0.1.1",
            label: "",
            typeName: "BitmapText",
            visible: true,
            children: [],
          },
          {
            id: "0.1.2",
            label: "",
            typeName: "Mesh",
            visible: true,
            children: [],
          },
        ],
      },
    ],
  });

  let tree = $state<TreeNodeData>(initial);
  let expandedIds = $state<Set<string>>(new Set([initial.id]));
  let selectedIds = $state<Array<string>>([]);
  let lastClearedIds = $state<Array<string> | null>(null);
  let isolatedRootId = $state<string | null>(null);
  let clipboardIds = $state<Array<string>>([]);

  function applySelection(ids: Array<string>) {
    if (ids.length > 0) {
      lastClearedIds = null;
    }

    selectedIds = ids;
  }

  const selectedId = $derived(
    selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null,
  );

  function getViewRoot(root: TreeNodeData): TreeNodeData {
    if (!isolatedRootId) {
      return root;
    }

    return findTreeNode(root, isolatedRootId) ?? root;
  }

  const laid = $derived(layoutTree(getViewRoot(tree), expandedIds));

  $effect(() => {
    if (!isolatedRootId) {
      return;
    }

    if (!findTreeNode(tree, isolatedRootId)) {
      isolatedRootId = null;
    }
  });

  function onselect(
    id: string,
    altKey: boolean,
    options: { toggleExpand?: boolean; additive?: boolean } = {},
  ) {
    const additive = options.additive === true;
    const toggleExpand = options.toggleExpand !== false;

    if (additive) {
      applySelection(toggleSelectedId(selectedIds, id));

      return;
    }

    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      expandOrCollapseSelection(altKey);

      return;
    }

    applySelection([id]);

    if (!toggleExpand) {
      return;
    }

    const viewRoot = getViewRoot(tree);
    const next = new Set(expandedIds);

    const changed = altKey
      ? collapseOneLevel(viewRoot, id, next)
      : expandOneLevel(viewRoot, id, next);

    if (changed) {
      expandedIds = next;
    }
  }

  function applyMove(
    sourceIds: Array<string>,
    parentId: string,
    index: number | null,
  ) {
    const ordered = sortIdsByTreeOrder(tree, sourceIds).filter((id) =>
      canReparent(tree, id, parentId),
    );

    if (ordered.length === 0) {
      return;
    }

    const prevTree = tree;
    const result = moveNodesInTree(tree, ordered, parentId, index);

    if (!result) {
      return;
    }

    const prevIdToUid = collectIdToUid(prevTree);
    const nextUidToId = collectUidToId(result.root);

    clipboardIds = remapIdListByUid(clipboardIds, prevIdToUid, nextUidToId);

    if (isolatedRootId) {
      const remapped = remapIdByUid(isolatedRootId, prevIdToUid, nextUidToId);

      if (remapped === null) {
        for (const sourceId of ordered) {
          if (
            isolatedRootId === sourceId ||
            isAncestorId(sourceId, isolatedRootId)
          ) {
            isolatedRootId = null;

            break;
          }
        }
      } else {
        isolatedRootId = remapped;
      }
    }

    tree = result.root;

    let nextExpanded = expandedIds;

    for (const newId of result.newIds) {
      nextExpanded = expandedIdsAfterMove(
        nextExpanded,
        prevTree,
        result.root,
        newId,
      );
    }

    if (isolatedRootId) {
      nextExpanded = new Set(nextExpanded);

      nextExpanded.add(isolatedRootId);
    }

    expandedIds = nextExpanded;

    const movedIds = result.newIds;

    lastClearedIds = null;

    applySelection(movedIds);

    setTimeout(() => {
      applySelection(movedIds);
    }, 0);
  }

  function onmove(
    sourceIds: Array<string>,
    parentId: string,
    index: number | null,
  ) {
    applyMove(sourceIds, parentId, index);
  }

  function toggleIsolate() {
    if (isolatedRootId) {
      isolatedRootId = null;

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
  }

  function toggleVisible() {
    if (selectedIds.length === 0) {
      return;
    }

    let next = tree;

    for (const id of selectedIds) {
      const updated = toggleVisibleInTree(next, id);

      if (updated) {
        next = updated;
      }
    }

    lastClearedIds = null;

    tree = next;
  }

  function expandOrCollapseSelection(altKey: boolean) {
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
      const nextId = levelNavTarget(laid.nodes, selectedId, key, toEnd);

      if (nextId === null || nextId === undefined) {
        return;
      }

      applySelection([nextId]);

      return;
    }

    const viewRoot = getViewRoot(tree);

    const result = depthNavTarget(
      viewRoot,
      laid.nodes,
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
    }

    applySelection([result.selectId]);
  }

  function onkeydown(e: KeyboardEvent) {
    const action = resolvePanelKey(e, {
      showHelp: false,
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
        break;

      case "clearSelection":
        if (selectedIds.length > 0) {
          lastClearedIds = [...selectedIds];
        }

        selectedIds = [];

        break;

      case "restoreSelection":
        if (!lastClearedIds || lastClearedIds.length === 0) {
          break;
        }

        {
          const ids = lastClearedIds;

          lastClearedIds = null;

          applySelection(ids);
        }

        break;

      case "copy":
        clipboardIds = sortIdsByTreeOrder(tree, action.ids);
        break;

      case "paste":
        applyMove(action.sourceIds, action.parentId, null);
        break;

      case "isolate":
        toggleIsolate();
        break;

      case "toggleVisible":
        toggleVisible();
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
    window.addEventListener("keydown", onkeydown, true);

    return () => window.removeEventListener("keydown", onkeydown, true);
  });
</script>

<div class="wrap">
  <SceneTree
    nodes={laid.nodes}
    edges={laid.edges}
    width={laid.width}
    height={laid.height}
    rootId={getViewRoot(tree).id}
    {selectedIds}
    {onselect}
    {onmove}
  />
</div>

<style>
  .wrap {
    min-height: 100vh;
    overflow: auto;
    background: linear-gradient(90deg, rgb(0 0 0 / 6%) 1px, transparent 1px),
      linear-gradient(rgb(0 0 0 / 6%) 1px, transparent 1px), #4a4a4a;
    background-size: 16px 16px;
  }
</style>
