import { normalizeSelectedIds } from '../multi-select';
import { resolveByPath } from './root';
import { clearSelectionIds, setSelectionIds } from './selection-ids';

import type { PageGlobals } from './pixi-node';

export function selectNodes(
    pathIds: Array<string>,
    win: PageGlobals = globalThis as PageGlobals,
): boolean
{
    if (pathIds.length === 0)
    {
        win.$pixi = undefined;

        clearSelectionIds();

        return true;
    }

    const normalized = normalizeSelectedIds(pathIds);
    const resolved: Array<string> = [];

    for (const pathId of normalized)
    {
        const node = resolveByPath(pathId, win);

        if (!node)
        {
            continue;
        }

        resolved.push(pathId);
    }

    if (resolved.length === 0)
    {
        win.$pixi = undefined;

        clearSelectionIds();

        return false;
    }

    const primaryId = resolved[resolved.length - 1];
    const primary = resolveByPath(primaryId, win);

    if (!primary)
    {
        win.$pixi = undefined;

        clearSelectionIds();

        return false;
    }

    win.$pixi = primary;

    setSelectionIds(resolved);

    return true;
}

export function selectNode(pathId: string, win: PageGlobals = globalThis as PageGlobals): boolean
{
    return selectNodes([pathId], win);
}
