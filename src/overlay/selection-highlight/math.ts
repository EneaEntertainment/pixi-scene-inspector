import { readWorldTransform } from './geometry';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { BoxPaint, MatrixLike } from './types';

export function localToRoot(paint: Pick<BoxPaint, 'matrix'>, lx: number, ly: number): { x: number; y: number }
{
    const { matrix } = paint;

    return {
        x : (matrix.a * lx) + (matrix.c * ly) + matrix.tx,
        y : (matrix.b * lx) + (matrix.d * ly) + matrix.ty,
    };
}

export function localToScreen(paint: BoxPaint, lx: number, ly: number): { x: number; y: number }
{
    const point = localToRoot(paint, lx, ly);

    return {
        x : paint.rootLeft + point.x,
        y : paint.rootTop + point.y,
    };
}

export function worldDeltaToLocal(matrix: MatrixLike, dx: number, dy: number): { x: number; y: number } | null
{
    const det = (matrix.a * matrix.d) - (matrix.b * matrix.c);

    if (!(Math.abs(det) > 1e-12))
    {
        return null;
    }

    return {
        x : ((matrix.d * dx) - (matrix.c * dy)) / det,
        y : ((matrix.a * dy) - (matrix.b * dx)) / det,
    };
}

export function worldDeltaToParentLocal(node: PixiNode, dxWorld: number, dyWorld: number): { x: number; y: number }
{
    const parent = node.parent;

    if (!parent)
    {
        return { x: dxWorld, y: dyWorld };
    }

    const matrix = readWorldTransform(parent);

    if (!matrix)
    {
        return { x: dxWorld, y: dyWorld };
    }

    return worldDeltaToLocal(matrix, dxWorld, dyWorld) ?? { x: dxWorld, y: dyWorld };
}

export function normalize2(x: number, y: number): { x: number; y: number } | null
{
    const len = Math.hypot(x, y);

    if (!(len > 1e-8))
    {
        return null;
    }

    return { x: x / len, y: y / len };
}

export function project(px: number, py: number, ox: number, oy: number, axis: { x: number; y: number }): number
{
    return ((px - ox) * axis.x) + ((py - oy) * axis.y);
}

function clipInfiniteLineToRect(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
): { x1: number; y1: number; x2: number; y2: number } | null
{
    const dx = bx - ax;
    const dy = by - ay;

    if (!(Math.abs(dx) > 1e-12) && !(Math.abs(dy) > 1e-12))
    {
        return null;
    }

    const hits: Array<{ x: number; y: number; t: number }> = [];

    const pushHit = (t: number, x: number, y: number) =>
    {
        if (x < left - 1e-6 || x > right + 1e-6 || y < top - 1e-6 || y > bottom + 1e-6)
        {
            return;
        }

        for (const hit of hits)
        {
            if (Math.abs(hit.t - t) < 1e-9)
            {
                return;
            }
        }

        hits.push({
            x : Math.min(right, Math.max(left, x)),
            y : Math.min(bottom, Math.max(top, y)),
            t,
        });
    };

    if (Math.abs(dx) > 1e-12)
    {
        const tLeft = (left - ax) / dx;

        pushHit(tLeft, left, ay + (tLeft * dy));

        const tRight = (right - ax) / dx;

        pushHit(tRight, right, ay + (tRight * dy));
    }

    if (Math.abs(dy) > 1e-12)
    {
        const tTop = (top - ay) / dy;

        pushHit(tTop, ax + (tTop * dx), top);

        const tBottom = (bottom - ay) / dy;

        pushHit(tBottom, ax + (tBottom * dx), bottom);
    }

    if (hits.length < 2)
    {
        return null;
    }

    hits.sort((a, b) => a.t - b.t);

    const first = hits[0];
    const last = hits[hits.length - 1];

    if (!first || !last)
    {
        return null;
    }

    return {
        x1 : first.x,
        y1 : first.y,
        x2 : last.x,
        y2 : last.y,
    };
}

export function outwardEdgeSegments(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
): Array<{ x1: number; y1: number; x2: number; y2: number }>
{
    const clipped = clipInfiniteLineToRect(ax, ay, bx, by, left, top, right, bottom);

    if (!clipped)
    {
        return [];
    }

    const dx = bx - ax;
    const dy = by - ay;
    const len2 = (dx * dx) + (dy * dy);

    if (!(len2 > 1e-16))
    {
        return [];
    }

    const tOf = (x: number, y: number) => (((x - ax) * dx) + ((y - ay) * dy)) / len2;
    const pointAt = (t: number) => ({
        x : ax + (t * dx),
        y : ay + (t * dy),
    });

    const tClipA = tOf(clipped.x1, clipped.y1);
    const tClipB = tOf(clipped.x2, clipped.y2);
    const tMin = Math.min(tClipA, tClipB);
    const tMax = Math.max(tClipA, tClipB);
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    if (tMin < -1e-8)
    {
        const endT = Math.min(0, tMax);

        if (endT - tMin > 1e-8)
        {
            const start = pointAt(tMin);
            const end = pointAt(endT);

            segments.push({
                x1 : start.x,
                y1 : start.y,
                x2 : end.x,
                y2 : end.y,
            });
        }
    }

    if (tMax > 1 + 1e-8)
    {
        const startT = Math.max(1, tMin);

        if (tMax - startT > 1e-8)
        {
            const start = pointAt(startT);
            const end = pointAt(tMax);

            segments.push({
                x1 : start.x,
                y1 : start.y,
                x2 : end.x,
                y2 : end.y,
            });
        }
    }

    return segments;
}
