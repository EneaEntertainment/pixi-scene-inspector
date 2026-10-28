import type { TreeNodeData } from './types';

export function findTreeNode(root: TreeNodeData, id: string): TreeNodeData | null
{
    if (root.id === id)
    {
        return root;
    }

    for (const child of root.children)
    {
        const found = findTreeNode(child, id);

        if (found)
        {
            return found;
        }
    }

    return null;
}

export function countTreeNodes(node: TreeNodeData): number
{
    return 1 + node.children.reduce((sum, child) => sum + countTreeNodes(child), 0);
}

export function isAncestorId(ancestorId: string, nodeId: string): boolean
{
    return nodeId === ancestorId || nodeId.startsWith(`${ancestorId}.`);
}

export function parentIdOf(id: string): string | null
{
    const idx = id.lastIndexOf('.');

    if (idx < 0)
    {
        return null;
    }

    return id.slice(0, idx);
}

export function collectTreeIds(node: TreeNodeData, into: Set<string> = new Set()): Set<string>
{
    into.add(node.id);

    for (const child of node.children)
    {
        collectTreeIds(child, into);
    }

    return into;
}

function collectTreeUids(node: TreeNodeData, into: Set<number> = new Set()): Set<number>
{
    into.add(node.uid);

    for (const child of node.children)
    {
        collectTreeUids(child, into);
    }

    return into;
}

const TREE_UID_CONTINUITY_THRESHOLD = 0.25;

export function isTreeRewrite(
    prev: TreeNodeData,
    next: TreeNodeData,
    threshold: number = TREE_UID_CONTINUITY_THRESHOLD,
): boolean
{
    const prevUids = collectTreeUids(prev);

    if (prevUids.size === 0)
    {
        return false;
    }

    const nextUids = collectTreeUids(next);
    let matched = 0;

    for (const uid of prevUids)
    {
        if (nextUids.has(uid))
        {
            matched += 1;
        }
    }

    return matched / prevUids.size < threshold;
}

function nodeNameMatches(node: TreeNodeData, query: string): boolean
{
    const q = query.trim().toLowerCase();

    if (!q)
    {
        return true;
    }

    if (node.label.toLowerCase().includes(q))
    {
        return true;
    }

    return node.typeName.toLowerCase().includes(q);
}

export function filterTreeByName(root: TreeNodeData, query: string): TreeNodeData | null
{
    const q = query.trim().toLowerCase();

    if (!q)
    {
        return root;
    }

    function walk(node: TreeNodeData): TreeNodeData | null
    {
        const children: Array<TreeNodeData> = [];

        for (const child of node.children)
        {
            const kept = walk(child);

            if (kept)
            {
                children.push(kept);
            }
        }

        const filterMatch = nodeNameMatches(node, q);

        if (!filterMatch && children.length === 0)
        {
            return null;
        }

        return {
            id       : node.id,
            uid      : node.uid,
            label    : node.label,
            typeName : node.typeName,
            visible  : node.visible,
            children,
            filterMatch,
        };
    }

    return walk(root);
}
