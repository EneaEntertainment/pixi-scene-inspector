import { resolveByPath } from './root';

import type { PageGlobals } from './pixi-node';

export function selectNode(pathId: string, win: PageGlobals = globalThis as PageGlobals): boolean
{
    const node = resolveByPath(pathId, win);

    if (!node)
    {
        return false;
    }

    win.$pixi = node;

    return true;
}
