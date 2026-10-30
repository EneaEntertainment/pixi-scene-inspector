import { isNodeAlive } from './pixi-node';
import { resolveByPath } from './root';
import { getSelectionIds } from './selection-ids';

import type { PageGlobals, PixiNode } from './pixi-node';

export function resolveAliveNodesByIds(
    ids: ReadonlyArray<string>,
    win: PageGlobals = globalThis as PageGlobals,
): Array<PixiNode>
{
    const nodes: Array<PixiNode> = [];

    for (const id of ids)
    {
        const node = resolveByPath(id, win);

        if (isNodeAlive(node))
        {
            nodes.push(node);
        }
    }

    return nodes;
}

export function resolveLiveSelectionNodes(win: PageGlobals = globalThis as PageGlobals): Array<PixiNode>
{
    const ids = getSelectionIds();

    if (ids.length > 1)
    {
        return resolveAliveNodesByIds(ids, win);
    }

    const node = win.$pixi;

    if (isNodeAlive(node))
    {
        return [node];
    }

    return [];
}
