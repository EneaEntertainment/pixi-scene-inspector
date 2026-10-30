import { isAncestorId } from './tree-ops';

import type { LaidOutNode } from './types';

const GAP_MIN = 8;

let activeTreeDragGestures = 0;

export function isTreeDragGestureActive(): boolean
{
    return activeTreeDragGestures > 0;
}

export function beginTreeDragGesture()
{
    activeTreeDragGestures += 1;
}

export function endTreeDragGesture()
{
    if (activeTreeDragGestures > 0)
    {
        activeTreeDragGestures -= 1;
    }
}

type DropVisual =
  | { kind: 'gap'; x: number; y: number; width: number; height: number }
  | { kind: 'node'; id: string };

export type DropTarget = {
    parentId: string;
    index: number | null;
    visuals: Array<DropVisual>;
};

type SiblingGroup = {
    parentId: string;
    siblings: Array<LaidOutNode>;
};

function collectGroups(nodes: Array<LaidOutNode>, rootId: string): Array<SiblingGroup>
{
    const groups: Array<SiblingGroup> = [];
    const root = nodes.find((n) => n.id === rootId);

    if (root && root.children.length > 0)
    {
        groups.push({ parentId: root.id, siblings: root.children });
    }

    for (const node of nodes)
    {
        if (node.id === rootId)
        {
            continue;
        }

        if (node.children.length > 0)
        {
            groups.push({ parentId: node.id, siblings: node.children });
        }
    }

    return groups;
}

function pointInRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean
{
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function insertIndexAtX(siblings: Array<LaidOutNode>, x: number): number
{
    for (let i = 0; i < siblings.length; i++)
    {
        const sib = siblings[i];

        if (!sib)
        {
            continue;
        }

        if (x < sib.x + (sib.width / 2))
        {
            return i;
        }
    }

    return siblings.length;
}

function gapVisual(siblings: Array<LaidOutNode>, index: number, leftBound: number, rightBound: number): DropVisual | null
{
    const first = siblings[0];

    if (!first)
    {
        return null;
    }

    const height = first.height * 2;
    const y = first.y - (first.height / 2);
    let x: number;
    let width: number;

    if (index <= 0)
    {
        x = leftBound;
        width = first.x - leftBound;
    }
    else if (index >= siblings.length)
    {
        const last = siblings[siblings.length - 1];

        if (!last)
        {
            return null;
        }

        x = last.x + last.width;
        width = rightBound - x;
    }
    else
    {
        const prev = siblings[index - 1];
        const next = siblings[index];

        if (!prev || !next)
        {
            return null;
        }

        x = prev.x + prev.width;
        width = next.x - x;
    }

    if (width < GAP_MIN)
    {
        const cx = x + (width / 2);

        x = cx - (GAP_MIN / 2);
        width = GAP_MIN;
    }

    return {
        kind: 'gap',
        x,
        y,
        width,
        height,
    };
}

type RowHit = {
    group: SiblingGroup;
    first: LaidOutNode;
    last: LaidOutNode;
    rowY: number;
    rowH: number;
};

function isBlockedTarget(targetId: string, sourceIds: ReadonlyArray<string>): boolean
{
    for (const sourceId of sourceIds)
    {
        if (targetId === sourceId || isAncestorId(sourceId, targetId))
        {
            return true;
        }
    }

    return false;
}

export function resolveDropTarget(
    nodes: Array<LaidOutNode>,
    rootId: string,
    sourceIds: ReadonlyArray<string>,
    pointerX: number,
    pointerY: number,
    canvasWidth: number,
): DropTarget | null
{
    if (sourceIds.length === 0 || sourceIds.includes(rootId))
    {
        return null;
    }

    for (const node of nodes)
    {
        if (isBlockedTarget(node.id, sourceIds))
        {
            continue;
        }

        if (
            pointInRect(pointerX, pointerY, node.x, node.y, node.width, node.height)
        )
        {
            return {
                parentId : node.id,
                index    : null,
                visuals  : [{ kind: 'node', id: node.id }],
            };
        }
    }

    const groups = collectGroups(nodes, rootId);
    const rowHits: Array<RowHit> = [];

    for (const group of groups)
    {
        if (isBlockedTarget(group.parentId, sourceIds))
        {
            continue;
        }

        const { siblings } = group;
        const first = siblings[0];

        if (!first)
        {
            continue;
        }

        const last = siblings[siblings.length - 1];

        if (!last)
        {
            continue;
        }

        const rowY = first.y - (first.height / 2);
        const rowH = first.height * 2;

        if (pointerY < rowY || pointerY > rowY + rowH)
        {
            continue;
        }

        rowHits.push({ group, first, last, rowY, rowH });
    }

    if (rowHits.length === 0)
    {
        return null;
    }

    rowHits.sort((a, b) => a.first.x - b.first.x);

    for (let i = 0; i < rowHits.length; i++)
    {
        const hit = rowHits[i];

        if (!hit)
        {
            continue;
        }

        const prev = rowHits[i - 1];
        const next = rowHits[i + 1];

        const leftBound = prev
            ? (prev.last.x + prev.last.width + hit.first.x) / 2
            : 0;

        const rightBound = next
            ? (hit.last.x + hit.last.width + next.first.x) / 2
            : canvasWidth;

        if (pointerX < leftBound || pointerX > rightBound)
        {
            continue;
        }

        const index = insertIndexAtX(hit.group.siblings, pointerX);
        const gap = gapVisual(hit.group.siblings, index, leftBound, rightBound);

        if (!gap)
        {
            continue;
        }

        return { parentId: hit.group.parentId, index, visuals: [gap] };
    }

    return null;
}
