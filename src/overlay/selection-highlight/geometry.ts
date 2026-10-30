import type { PageGlobals, PixiNode } from '../../page-ops/pixi-node';
import type { LocalBounds, MatrixLike } from './types';

export function asFiniteNumber(value: unknown): number | null
{
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readLocalBounds(node: PixiNode): LocalBounds | null
{
    if (typeof node.getLocalBounds !== 'function')
    {
        return null;
    }

    try
    {
        const bounds = node.getLocalBounds() as Record<string, unknown> | null | undefined;

        if (!bounds || typeof bounds !== 'object')
        {
            return null;
        }

        const minX = asFiniteNumber(bounds.minX) ?? asFiniteNumber(bounds.x);
        const minY = asFiniteNumber(bounds.minY) ?? asFiniteNumber(bounds.y);

        if (minX === null || minY === null)
        {
            return null;
        }

        const maxX = asFiniteNumber(bounds.maxX);
        const maxY = asFiniteNumber(bounds.maxY);

        if (maxX !== null && maxY !== null)
        {
            return { minX, minY, maxX, maxY };
        }

        const width = asFiniteNumber(bounds.width);
        const height = asFiniteNumber(bounds.height);

        if (width === null || height === null)
        {
            return null;
        }

        return {
            minX,
            minY,
            maxX : minX + width,
            maxY : minY + height,
        };
    }
    catch
    {
        return null;
    }
}

export function readWorldTransform(node: PixiNode): MatrixLike | null
{
    const matrix = node.worldTransform;

    if (!matrix)
    {
        return null;
    }

    const a = asFiniteNumber(matrix.a);
    const b = asFiniteNumber(matrix.b);
    const c = asFiniteNumber(matrix.c);
    const d = asFiniteNumber(matrix.d);
    const tx = asFiniteNumber(matrix.tx);
    const ty = asFiniteNumber(matrix.ty);

    if (
        a === null
        || b === null
        || c === null
        || d === null
        || tx === null
        || ty === null
    )
    {
        return null;
    }

    return { a, b, c, d, tx, ty };
}

export function findPixiCanvas(win: PageGlobals): HTMLCanvasElement | null
{
    const app = win.__PIXI_APP__;
    const renderer = win.__PIXI_RENDERER__ || app?.renderer;

    const candidates = [
        app?.canvas,
        app?.view,
        renderer?.canvas,
        renderer?.view,
    ];

    for (const candidate of candidates)
    {
        if (candidate instanceof HTMLCanvasElement)
        {
            return candidate;
        }
    }

    return null;
}

export function readScreenSize(win: PageGlobals, canvas: HTMLCanvasElement): { width: number; height: number }
{
    const app = win.__PIXI_APP__;
    const screenW = asFiniteNumber(app?.screen?.width);
    const screenH = asFiniteNumber(app?.screen?.height);

    if (screenW !== null && screenH !== null && screenW > 0 && screenH > 0)
    {
        return { width: screenW, height: screenH };
    }

    const renderer = win.__PIXI_RENDERER__ || app?.renderer;
    const resolution = asFiniteNumber(renderer?.resolution) ?? 1;
    const rendererW = asFiniteNumber(renderer?.width);
    const rendererH = asFiniteNumber(renderer?.height);

    if (
        rendererW !== null
        && rendererH !== null
        && resolution > 0
        && rendererW > 0
        && rendererH > 0
    )
    {
        return {
            width  : rendererW / resolution,
            height : rendererH / resolution,
        };
    }

    const cssW = canvas.clientWidth || canvas.getBoundingClientRect().width;
    const cssH = canvas.clientHeight || canvas.getBoundingClientRect().height;

    return {
        width  : cssW > 0 ? cssW : 1,
        height : cssH > 0 ? cssH : 1,
    };
}

export function hasAnchor(node: PixiNode): boolean
{
    const anchor = node.anchor;

    if (!anchor)
    {
        return false;
    }

    return asFiniteNumber(anchor.x) !== null && asFiniteNumber(anchor.y) !== null;
}

export function worldCorners(bounds: LocalBounds, matrix: MatrixLike): Array<{ x: number; y: number }>
{
    const points = [
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.maxY },
        { x: bounds.minX, y: bounds.maxY },
    ];

    return points.map((point) => ({
        x : (matrix.a * point.x) + (matrix.c * point.y) + matrix.tx,
        y : (matrix.b * point.x) + (matrix.d * point.y) + matrix.ty,
    }));
}
