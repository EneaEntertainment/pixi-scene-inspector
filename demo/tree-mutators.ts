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

export function moveNodeInTree(
    root: TreeNodeData,
    sourceId: string,
    newParentId: string,
    index: number | null,
): { root: TreeNodeData; newId: string; newParentId: string } | null
{
    if (!canReparent(root, sourceId, newParentId))
    {
        return null;
    }

    const next = cloneTree(root);
    const source = findTreeNode(next, sourceId);
    const newParent = findTreeNode(next, newParentId);

    if (!source || !newParent)
    {
        return null;
    }

    const oldParent = findParentNode(next, sourceId);

    if (!oldParent)
    {
        return null;
    }

    const oldIndex = oldParent.children.findIndex((c) => c.id === sourceId);

    if (oldIndex < 0)
    {
        return null;
    }

    let insertAt = index === null ? newParent.children.length : Math.max(0, index);

    if (oldParent === newParent)
    {
        if (insertAt > oldIndex)
        {
            insertAt -= 1;
        }

        if (insertAt === oldIndex)
        {
            return null;
        }
    }

    oldParent.children.splice(oldIndex, 1);
    insertAt = Math.min(insertAt, newParent.children.length);
    newParent.children.splice(insertAt, 0, source);

    remapIdsInPlace(next, next.id);

    return { root: next, newId: source.id, newParentId: newParent.id };
}
