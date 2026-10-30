import { canReparent, canToggleTreeNodeVisible } from '../src/panel/panel-session';
import { findTreeNode } from '../src/tree-ops';

import type { TreeNodeData } from '../src/types';

function findParentNode(root: TreeNodeData, childId: string): TreeNodeData | null
{
    for (const child of root.children)
    {
        if (child.id === childId)
        {
            return root;
        }

        const found = findParentNode(child, childId);

        if (found)
        {
            return found;
        }
    }

    return null;
}

function cloneTree(node: TreeNodeData): TreeNodeData
{
    return {
        id       : node.id,
        uid      : node.uid,
        label    : node.label,
        typeName : node.typeName,
        visible  : node.visible,
        children : node.children.map(cloneTree),
    };
}

function remapIdsInPlace(node: TreeNodeData, id: string)
{
    node.id = id;

    for (let i = 0; i < node.children.length; i++)
    {
        const child = node.children[i];

        if (!child)
        {
            continue;
        }

        remapIdsInPlace(child, `${id}.${i}`);
    }
}

export function toggleVisibleInTree(root: TreeNodeData, id: string): TreeNodeData | null
{
    const next = cloneTree(root);
    const node = findTreeNode(next, id);

    if (!node)
    {
        return null;
    }

    if (!canToggleTreeNodeVisible(node))
    {
        return null;
    }

    node.visible = !node.visible;

    return next;
}

export function moveNodesInTree(
    root: TreeNodeData,
    sourceIds: Array<string>,
    newParentId: string,
    index: number | null,
): { root: TreeNodeData; newIds: Array<string>; newParentId: string } | null
{
    const movable = sourceIds.filter((sourceId) => canReparent(root, sourceId, newParentId));

    if (movable.length === 0)
    {
        return null;
    }

    const next = cloneTree(root);
    const newParent = findTreeNode(next, newParentId);

    if (!newParent)
    {
        return null;
    }

    const movableSet = new Set(movable);
    let insertAt: number;

    if (index === null)
    {
        insertAt = -1;
    }
    else
    {
        let removedBefore = 0;

        for (let i = 0; i < index && i < newParent.children.length; i++)
        {
            const sib = newParent.children[i];

            if (sib && movableSet.has(sib.id))
            {
                removedBefore += 1;
            }
        }

        insertAt = Math.max(0, index - removedBefore);
    }

    const moved: Array<TreeNodeData> = [];

    for (const sourceId of movable)
    {
        const source = findTreeNode(next, sourceId);

        if (!source)
        {
            continue;
        }

        const oldParent = findParentNode(next, source.id);

        if (!oldParent)
        {
            continue;
        }

        const oldIndex = oldParent.children.findIndex((c) => c.id === source.id);

        if (oldIndex < 0)
        {
            continue;
        }

        oldParent.children.splice(oldIndex, 1);
        moved.push(source);
    }

    if (moved.length === 0)
    {
        return null;
    }

    if (insertAt < 0)
    {
        insertAt = newParent.children.length;
    }
    else
    {
        insertAt = Math.min(insertAt, newParent.children.length);
    }

    for (const node of moved)
    {
        newParent.children.splice(insertAt, 0, node);

        insertAt += 1;
    }

    remapIdsInPlace(next, next.id);

    return {
        root        : next,
        newIds      : moved.map((node) => node.id),
        newParentId : newParent.id,
    };
}
