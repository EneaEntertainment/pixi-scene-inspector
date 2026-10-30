import { isHideBlockedTypeName } from '../node-type-config';
import { isAncestorId, parentIdOf, remapIdsByUid } from '../tree-ops';

import type { TreeNodeData } from '../types';

export function canReparent(
    tree: TreeNodeData,
    sourceId: string,
    parentId: string,
): boolean
{
    if (sourceId === tree.id)
    {
        return false;
    }

    if (sourceId === parentId)
    {
        return false;
    }

    if (isAncestorId(sourceId, parentId))
    {
        return false;
    }

    return true;
}

export function canToggleTreeNodeVisible(
    node: Pick<TreeNodeData, 'typeName' | 'visible'>,
): boolean
{
    if (!node.visible)
    {
        return true;
    }

    return !isHideBlockedTypeName(node.typeName);
}

export function seedExpandedRoot(rootId: string): Set<string>
{
    return new Set([rootId]);
}

export function expandedIdsAfterMove(
    expandedIds: Set<string>,
    prevTree: TreeNodeData,
    nextTree: TreeNodeData,
    movedId: string,
): Set<string>
{
    const nextExpanded = remapIdsByUid(expandedIds, prevTree, nextTree);
    const newParentId = parentIdOf(movedId);

    if (newParentId)
    {
        nextExpanded.add(newParentId);
    }

    nextExpanded.add(nextTree.id);

    return nextExpanded;
}

export function ensureMovedParentExpanded(
    expandedIds: Set<string>,
    nextTree: TreeNodeData,
    movedId: string,
): Set<string>
{
    const nextExpanded = new Set(expandedIds);
    const newParentId = parentIdOf(movedId);

    if (newParentId)
    {
        nextExpanded.add(newParentId);
    }

    nextExpanded.add(nextTree.id);

    return nextExpanded;
}
