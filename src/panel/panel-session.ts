import { canEditVisibleState } from '../page-ops/visibility';
import { findTreeNode, isAncestorId, parentIdOf, remapIdsByUid } from '../tree-ops';

import type { TreeNodeData } from '../types';

function isParticleTypeName(typeName: string): boolean
{
    return typeName === 'Particle';
}

function isParticleHostTypeName(typeName: string): boolean
{
    return (
        typeName === 'ParticleContainer'
        || typeName === 'ParticleContainer3D'
    );
}

export function canReparent(tree: TreeNodeData, sourceId: string, parentId: string): boolean
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

    const source = findTreeNode(tree, sourceId);
    const parent = findTreeNode(tree, parentId);

    if (!source || !parent)
    {
        return false;
    }

    if (isParticleTypeName(source.typeName) || isParticleHostTypeName(parent.typeName))
    {
        return false;
    }

    return true;
}

export function canToggleTreeNodeVisible(node: Pick<TreeNodeData, 'visible' | 'hideBlocked'>): boolean
{
    return canEditVisibleState(node.visible, node.hideBlocked);
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

export function ensureMovedParentExpanded(expandedIds: Set<string>, nextTree: TreeNodeData, movedId: string): Set<string>
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
