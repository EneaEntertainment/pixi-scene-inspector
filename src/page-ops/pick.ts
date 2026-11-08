import {
    findPixiCanvas,
    readLocalBounds,
    readScreenSize,
    readWorldTransform,
    worldCorners,
} from '../overlay/selection-highlight/geometry';
import { childrenOf, findRoot, pathOf, resolveByPath } from './root';

import type { PageGlobals, PixiNode } from './pixi-node';

type IPoint = {
    x: number;
    y: number;
};

type PickOptions = {
    includeHidden?: boolean;
    rootPathId?: string | null;
};

function pointInQuad(point: IPoint, corners: Array<IPoint>): boolean
{
    if (corners.length < 4)
    {
        return false;
    }

    let sign = 0;

    for (let i = 0; i < 4; i++)
    {
        const a = corners[i];
        const b = corners[(i + 1) % 4];

        if (!a || !b)
        {
            return false;
        }

        const cross = ((b.x - a.x) * (point.y - a.y)) - ((b.y - a.y) * (point.x - a.x));

        if (Math.abs(cross) < 1e-9)
        {
            continue;
        }

        const next = cross > 0 ? 1 : -1;

        if (sign === 0)
        {
            sign = next;
        }
        else if (sign !== next)
        {
            return false;
        }
    }

    return true;
}

function nodeContainsPoint(node: PixiNode, point: IPoint): boolean
{
    const contains = (node as PixiNode & { containsPoint?: (value: IPoint) => boolean; }).containsPoint;

    if (typeof contains === 'function')
    {
        try
        {
            if (contains.call(node, point))
            {
                return true;
            }
        }
        catch
        {
            void 0;
        }
    }

    if (typeof node.getBounds === 'function')
    {
        try
        {
            const bounds = node.getBounds() as {
                containsPoint?: (x: number, y: number) => boolean;
                contains?: (x: number, y: number) => boolean;
            } | null | undefined;

            if (bounds && typeof bounds === 'object')
            {
                if (typeof bounds.containsPoint === 'function')
                {
                    return bounds.containsPoint(point.x, point.y) === true;
                }

                if (typeof bounds.contains === 'function')
                {
                    return bounds.contains(point.x, point.y) === true;
                }
            }
        }
        catch
        {
            void 0;
        }
    }

    const matrix = readWorldTransform(node);
    const local = readLocalBounds(node);

    if (!matrix || !local)
    {
        return false;
    }

    return pointInQuad(point, worldCorners(local, matrix));
}

function collectHits(point: IPoint, node: PixiNode, includeHidden: boolean, out: Array<PixiNode>)
{
    if (!includeHidden && node.visible === false)
    {
        return;
    }

    const kids = childrenOf(node);

    for (let i = kids.length - 1; i >= 0; i -= 1)
    {
        const child = kids[i];

        if (child)
        {
            collectHits(point, child, includeHidden, out);
        }
    }

    if (nodeContainsPoint(node, point))
    {
        out.push(node);
    }
}

function clientToWorld(clientX: number, clientY: number, win: PageGlobals): IPoint | null
{
    const canvas = findPixiCanvas(win);

    if (!canvas)
    {
        return null;
    }

    const rect = canvas.getBoundingClientRect();

    if (!(rect.width > 0) || !(rect.height > 0))
    {
        return null;
    }

    const screen = readScreenSize(win, canvas);

    return {
        x : (clientX - rect.left) * (screen.width / rect.width),
        y : (clientY - rect.top) * (screen.height / rect.height),
    };
}

function pickNodesAt(point: IPoint, win: PageGlobals, includeHidden: boolean, rootPathId?: string | null): Array<PixiNode>
{
    const root = rootPathId ? resolveByPath(rootPathId, win) : findRoot(win)?.root;

    if (!root)
    {
        return [];
    }

    const hits: Array<PixiNode> = [];

    collectHits(point, root, includeHidden, hits);

    if (hits.length > 1 && hits[hits.length - 1] === root)
    {
        hits.length -= 1;
    }

    return hits;
}

function cyclePick(hits: Array<PixiNode>, current: PixiNode | null | undefined, moved: boolean): PixiNode
{
    if (moved || hits.length === 1)
    {
        return hits[0];
    }

    let index = current ? hits.indexOf(current) : -1;

    if (index === -1 || index === hits.length - 1)
    {
        index = 0;
    }
    else
    {
        index += 1;
    }

    return hits[index];
}

export function pickPathIdAt(
    clientX: number,
    clientY: number,
    currentPathId: string | null | undefined,
    moved: boolean,
    win: PageGlobals = globalThis as PageGlobals,
    options: PickOptions = {},
): string | null
{
    const point = clientToWorld(clientX, clientY, win);

    if (!point)
    {
        return null;
    }

    const hits = pickNodesAt(point, win, options.includeHidden === true, options.rootPathId);

    if (hits.length === 0)
    {
        return null;
    }

    const current = currentPathId ? resolveByPath(currentPathId, win) : win.$pixi;

    return pathOf(cyclePick(hits, current, moved), win);
}
