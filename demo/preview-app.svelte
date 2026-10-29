<script lang="ts">
  import { onMount } from "svelte";
  import { layoutTree } from "../src/layout";
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
  import { moveNodeInTree, toggleVisibleInTree } from "./tree-mutators";

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
  let selectedId = $state<string | null>(null);
  let isolatedRootId = $state<string | null>(null);
  let clipboardId = $state<string | null>(null);

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

  function onselect(id: string, altKey: boolean, toggleExpand = true) {
    selectedId = id;

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

  function applyMove(sourceId: string, parentId: string, index: number | null) {
    if (!canReparent(tree, sourceId, parentId)) {
      return;
    }

    const prevTree = tree;
    const result = moveNodeInTree(tree, sourceId, parentId, index);

    if (!result) {
      return;
    }

    const prevIdToUid = collectIdToUid(prevTree);
    const nextUidToId = collectUidToId(result.root);

    if (clipboardId === sourceId) {
      clipboardId = result.newId;
    } else if (clipboardId && isAncestorId(sourceId, clipboardId)) {
      clipboardId = null;
    } else if (clipboardId) {
      clipboardId = remapIdByUid(clipboardId, prevIdToUid, nextUidToId);
    }

    if (isolatedRootId === sourceId) {
      isolatedRootId = result.newId;
    } else if (isolatedRootId && isAncestorId(sourceId, isolatedRootId)) {
      isolatedRootId = null;
    } else if (isolatedRootId) {
      isolatedRootId = remapIdByUid(isolatedRootId, prevIdToUid, nextUidToId);
    }

    tree = result.root;

    let nextExpanded = expandedIdsAfterMove(
      expandedIds,
      prevTree,
      result.root,
      result.newId,
    );

    if (isolatedRootId) {
      nextExpanded = new Set(nextExpanded);

      nextExpanded.add(isolatedRootId);
    }

    expandedIds = nextExpanded;

    const movedId = result.newId;

    selectedId = movedId;

    setTimeout(() => {
      selectedId = movedId;
    }, 0);
  }

  function onmove(sourceId: string, parentId: string, index: number | null) {
    applyMove(sourceId, parentId, index);
  }

  function toggleIsolate() {
    if (!selectedId) {
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
  }

  function toggleVisible() {
    if (!selectedId) {
      return;
    }

    const next = toggleVisibleInTree(tree, selectedId);

    if (next) {
      tree = next;
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

      selectedId = nextId;

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

    selectedId = result.selectId;
  }

  function onkeydown(e: KeyboardEvent) {
    const action = resolvePanelKey(e, {
      showHelp: false,
      selectedId,
      clipboardId,
    });

    if (!action) {
      return;
    }

    e.preventDefault();

    switch (action.type) {
      case "closeHelp":
        break;

      case "copy":
        clipboardId = action.id;
        break;

      case "paste":
        applyMove(action.sourceId, action.parentId, null);
        break;

      case "isolate":
        toggleIsolate();
        break;

      case "toggleVisible":
        toggleVisible();
        break;

      case "expand":
        if (selectedId) {
          onselect(selectedId, false);
        }

        break;
      case "collapse":
        if (selectedId) {
          onselect(selectedId, true);
        }

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
    {selectedId}
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
