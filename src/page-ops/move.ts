import { bitmapPageMeshInsertOffset, childrenOf, pathOf, resolveByPath } from './root';
import { setSelectionIds } from './selection-ids';

import type { PageGlobals, PixiNode } from './pixi-node';

function isDescendant(ancestor: PixiNode, node: PixiNode): boolean
{
    let cur: PixiNode | null | undefined = node;

    while (cur)
    {
        if (cur === ancestor)
        {
            return true;
        }

        cur = cur.parent;
    }

    return false;
}

function canMoveChild(child: PixiNode, parent: PixiNode): boolean
{
    if (child === parent)
    {
        return false;
    }

    if (isDescendant(child, parent))
    {
        return false;
    }

    return typeof parent.addChild === 'function';
}

function countMovingBeforeIndex(parent: PixiNode, moving: ReadonlySet<PixiNode>, index: number): number
{
    const kids = childrenOf(parent);
    const limit = Math.min(index, kids.length);
    let count = 0;

    for (let i = 0; i < limit; i++)
    {
        const kid = kids[i];

        if (kid && moving.has(kid))
        {
            count += 1;
        }
    }

    return count;
}

function detachChild(child: PixiNode)
{
    const currentParent = child.parent;

    if (!currentParent || typeof currentParent.removeChild !== 'function')
    {
        return;
    }

    currentParent.removeChild(child);
}

function insertChildAt(parent: PixiNode, child: PixiNode, desired: number)
{
    if (typeof parent.addChildAt !== 'function')
    {
        parent.addChild?.(child);

        return;
    }

    const kids = childrenOf(parent);
    const at = Math.max(0, Math.min(desired, kids.length));

    parent.addChildAt(child, at + bitmapPageMeshInsertOffset(parent, at, child));
}

export function moveNodes(
    sourceIds: Array<string>,
    parentId: string,
    index: number | null,
    win: PageGlobals = globalThis as PageGlobals,
): Array<string> | null
{
    const parent = resolveByPath(parentId, win);

    if (!parent || typeof parent.addChild !== 'function')
    {
        return null;
    }

    const children: Array<PixiNode> = [];

    for (const sourceId of sourceIds)
    {
        const child = resolveByPath(sourceId, win);

        if (!child || !canMoveChild(child, parent))
        {
            continue;
        }

        children.push(child);
    }

    if (children.length === 0)
    {
        return null;
    }

    if (index === null)
    {
        parent.addChild(...children);
    }
    else
    {
        const movingSet = new Set(children);
        let at = Math.max(0, index - countMovingBeforeIndex(parent, movingSet, index));

        for (const child of children)
        {
            detachChild(child);
        }

        for (const child of children)
        {
            insertChildAt(parent, child, at);

            at += 1;
        }
    }

    const paths: Array<string> = [];

    for (const child of children)
    {
        const nextPath = pathOf(child, win);

        if (nextPath)
        {
            paths.push(nextPath);
        }
    }

    if (paths.length === 0)
    {
        return null;
    }

    const primary = children[children.length - 1];

    if (primary)
    {
        win.$pixi = primary;
    }

    setSelectionIds(paths);

    return paths;
}

export function moveNode(
    sourceId: string,
    parentId: string,
    index: number | null,
    win: PageGlobals = globalThis as PageGlobals,
): string | null
{
    const paths = moveNodes([sourceId], parentId, index, win);

    return paths?.[0] ?? null;
}
