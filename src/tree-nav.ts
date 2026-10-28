import { findTreeNode } from './tree-ops';

import type { LaidOutNode, TreeNodeData } from './types';

export function levelNavTarget(
    nodes: Array<LaidOutNode>,
    selectedId: string,
    key: 'ArrowLeft' | 'ArrowRight',
    toEnd: boolean,
): string | null
{
    const parent = findLaidParent(nodes, selectedId);

    if (!parent)
    {
        return null;
    }

    const siblings = parent.children;

    if (siblings.length === 0)
    {
        return null;
    }

    const index = siblings.findIndex((node) => node.id === selectedId);

    if (index < 0)
    {
        return null;
    }

    let nextIndex = index;

    if (toEnd)
    {
        nextIndex = key === 'ArrowLeft' ? 0 : siblings.length - 1;
    }
    else if (key === 'ArrowLeft')
    {
        if (index <= 0)
        {
            return null;
        }

        nextIndex = index - 1;
    }
    else
    {
        if (index >= siblings.length - 1)
        {
            return null;
        }

        nextIndex = index + 1;
    }

    const nextId = siblings[nextIndex]?.id;

    if (nextId === null || nextId === undefined || nextId === selectedId)
    {
        return null;
    }

    return nextId;
}

type DepthNavResult = {
    selectId: string;
    expandAlong: Array<string>;
};

function findLaidParent(nodes: Array<LaidOutNode>, childId: string): LaidOutNode | null
{
    for (const node of nodes)
    {
        if (node.children.some((c) => c.id === childId))
        {
            return node;
        }
    }

    return null;
}

function firstDescendantPath(
    node: TreeNodeData,
    expandedIds: ReadonlySet<string>,
    expandAlong: Array<string>,
    toLeaf: boolean,
): string
{
    let current = node;

    while (current.children.length > 0)
    {
        if (!expandedIds.has(current.id) && !expandAlong.includes(current.id))
        {
            expandAlong.push(current.id);
        }

        const next = current.children[0];

        if (!next)
        {
            break;
        }

        current = next;

        if (!toLeaf)
        {
            return current.id;
        }
    }

    return current.id;
}

export function depthNavTarget(
    root: TreeNodeData,
    nodes: Array<LaidOutNode>,
    expandedIds: ReadonlySet<string>,
    selectedId: string,
    key: 'ArrowUp' | 'ArrowDown',
    toEnd: boolean,
): DepthNavResult | null
{
    if (key === 'ArrowUp')
    {
        if (toEnd)
        {
            if (selectedId === root.id)
            {
                return null;
            }

            return { selectId: root.id, expandAlong: [] };
        }

        const parent = findLaidParent(nodes, selectedId);

        if (!parent)
        {
            return null;
        }

        return { selectId: parent.id, expandAlong: [] };
    }

    const data = findTreeNode(root, selectedId);

    if (!data || data.children.length === 0)
    {
        return null;
    }

    const expandAlong: Array<string> = [];
    const selectId = firstDescendantPath(data, expandedIds, expandAlong, toEnd);

    if (selectId === selectedId && expandAlong.length === 0)
    {
        return null;
    }

    return { selectId, expandAlong };
}

export function expandOneLevel(root: TreeNodeData, nodeId: string, expandedIds: Set<string>): boolean
{
    const node = findTreeNode(root, nodeId);

    if (!node || node.children.length === 0)
    {
        return false;
    }

    if (!expandedIds.has(nodeId))
    {
        expandedIds.add(nodeId);

        return true;
    }

    const frontier: Array<string> = [];

    function walk(n: TreeNodeData)
    {
        if (n.children.length === 0)
        {
            return;
        }

        if (!expandedIds.has(n.id))
        {
            frontier.push(n.id);

            return;
        }

        for (const c of n.children)
        {
            walk(c);
        }
    }
    for (const c of node.children)
    {
        walk(c);
    }

    if (frontier.length === 0)
    {
        return false;
    }

    for (const id of frontier)
    {
        expandedIds.add(id);
    }

    return true;
}

export function collapseOneLevel(root: TreeNodeData, nodeId: string, expandedIds: Set<string>): boolean
{
    const node = findTreeNode(root, nodeId);

    if (!node)
    {
        return false;
    }

    const deepest: Array<string> = [];
    let maxDepth = -1;

    function walk(n: TreeNodeData, depth: number)
    {
        if (!expandedIds.has(n.id))
        {
            return;
        }

        if (depth > maxDepth)
        {
            maxDepth = depth;
            deepest.length = 0;
            deepest.push(n.id);
        }
        else if (depth === maxDepth)
        {
            deepest.push(n.id);
        }

        for (const c of n.children)
        {
            walk(c, depth + 1);
        }
    }

    walk(node, 0);
    if (deepest.length === 0)
    {
        return false;
    }

    for (const id of deepest)
    {
        expandedIds.delete(id);
    }

    return true;
}
