import { isAncestorId } from './tree-ops';

import type { TreeNodeData } from './types';

export function sortIdsByTreeOrder(
    root: TreeNodeData,
    ids: ReadonlyArray<string>,
): Array<string>
{
    const want = new Set(ids);
    const ordered: Array<string> = [];

    function walk(node: TreeNodeData)
    {
        if (want.has(node.id))
        {
            ordered.push(node.id);
        }

        for (const child of node.children)
        {
            walk(child);
        }
    }

    walk(root);

    return ordered;
}

function addSelectedId(selectedIds: ReadonlyArray<string>, id: string): Array<string>
{
    const next: Array<string> = [];

    for (const existing of selectedIds)
    {
        if (existing === id)
        {
            continue;
        }

        if (isAncestorId(existing, id) || isAncestorId(id, existing))
        {
            continue;
        }

        next.push(existing);
    }

    next.push(id);

    return next;
}

export function toggleSelectedId(selectedIds: ReadonlyArray<string>, id: string): Array<string>
{
    if (selectedIds.includes(id))
    {
        return selectedIds.filter((existing) => existing !== id);
    }

    return addSelectedId(selectedIds, id);
}

export function normalizeSelectedIds(ids: ReadonlyArray<string>): Array<string>
{
    let next: Array<string> = [];

    for (const id of ids)
    {
        next = addSelectedId(next, id);
    }

    return next;
}

export function remapIdListByUid(
    ids: ReadonlyArray<string>,
    prevIdToUid: ReadonlyMap<string, number>,
    nextUidToId: ReadonlyMap<number, string>,
): Array<string>
{
    const next: Array<string> = [];

    for (const id of ids)
    {
        const uid = prevIdToUid.get(id);

        if (uid === undefined)
        {
            continue;
        }

        const remapped = nextUidToId.get(uid);

        if (remapped !== undefined)
        {
            next.push(remapped);
        }
    }

    return next;
}
