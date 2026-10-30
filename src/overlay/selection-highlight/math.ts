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
