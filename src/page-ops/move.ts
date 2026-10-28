import { bitmapPageMeshInsertOffset, childrenOf, pathOf, resolveByPath } from './root';

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

export function moveNode(
    sourceId: string,
    parentId: string,
    index: number | null,
    win: PageGlobals = globalThis as PageGlobals,
): string | null
{
    const child = resolveByPath(sourceId, win);
    const parent = resolveByPath(parentId, win);

    if (!child || !parent)
    {
        return null;
    }

    if (child === parent)
    {
        return null;
    }

    if (isDescendant(child, parent))
    {
        return null;
    }

    if (typeof parent.addChild !== 'function')
    {
        return null;
    }

    const desired = index;

    if (desired === null)
    {
        parent.addChild(child);
    }
    else if (typeof parent.addChildAt === 'function')
    {
        let at = desired;
        const kids = childrenOf(parent);
        const oldIndex = kids.indexOf(child);

        if (oldIndex >= 0 && at > oldIndex)
        {
            at -= 1;
        }

        at = Math.max(0, Math.min(at, kids.length - (oldIndex >= 0 ? 1 : 0)));

        if (oldIndex === at)
        {
            return pathOf(child, win);
        }

        parent.addChildAt(child, at + bitmapPageMeshInsertOffset(parent, at, child));
    }
    else
    {
        parent.addChild(child);
    }

    win.$pixi = child;

    return pathOf(child, win);
}
