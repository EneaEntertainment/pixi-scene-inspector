import { asFiniteNumber } from './geometry';
import {
    localBoundsWorldCorners,
    projectWorldPoint,
    readLocalAxesWorld,
} from './geometry-3d';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { Vec3 } from './math-3d';

type View3DLike = NonNullable<PixiNode['_view3d']>;

export type ScreenEdge = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

const SCREEN_PAD_FACTOR = 1;

const BOX_EDGE_INDICES: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
];

export function localBoundsScreenEdges(
    node: PixiNode,
    view: View3DLike,
    scaleX: number,
    scaleY: number,
): Array<ScreenEdge>
{
    const corners = localBoundsWorldCorners(node);

    if (!corners)
    {
        return [];
    }

    const edges: Array<ScreenEdge> = [];

    for (const [ai, bi] of BOX_EDGE_INDICES)
    {
        const a = corners[ai];
        const b = corners[bi];

        if (!a || !b)
        {
            continue;
        }

        const screen = projectWorldEdge(view, a, b, scaleX, scaleY);

        if (screen)
        {
            edges.push(screen);
        }
    }

    return edges;
}

function cameraSpaceZ(point: Vec3, origin: Vec3, axisZ: Vec3): number
{
    return (
        ((point.x - origin.x) * axisZ.x)
        + ((point.y - origin.y) * axisZ.y)
        + ((point.z - origin.z) * axisZ.z)
    );
}

function lerpWorld(a: Vec3, b: Vec3, t: number): Vec3
{
    return {
        x : a.x + ((b.x - a.x) * t),
        y : a.y + ((b.y - a.y) * t),
        z : a.z + ((b.z - a.z) * t),
    };
}

function viewFrontClipZ(camera: NonNullable<View3DLike['camera']>): number
{
    const near = asFiniteNumber((camera as { near?: unknown }).near);
    const safeNear = Math.max(near ?? 0.1, 1e-3);

    return -(safeNear * 1.05);
}

function originFromMatrixElements(elements: ArrayLike<number>): Vec3
{
    return {
        x : elements[12],
        y : elements[13],
        z : elements[14],
    };
}

function readViewCameraAxes(camera: PixiNode): { origin: Vec3; z: Vec3 } | null
{
    const withTransform = camera as PixiNode & {
        getGlobalTransform?: (out?: unknown, skipUpdate?: boolean) => { elements?: ArrayLike<number> };
        getGlobalPosition?: (out?: unknown, skipUpdate?: boolean) => unknown;
    };

    if (typeof withTransform.getGlobalTransform === 'function')
    {
        try
        {
            const matrix = withTransform.getGlobalTransform(undefined, false);
            const elements = matrix?.elements;

            if (elements && elements.length >= 16)
            {
                let origin: Vec3 | null = null;

                if (typeof withTransform.getGlobalPosition === 'function')
                {
                    const world = withTransform.getGlobalPosition(undefined, false) as Vec3;
                    const x = asFiniteNumber(world?.x);
                    const y = asFiniteNumber(world?.y);
                    const z = asFiniteNumber(world?.z);

                    if (x !== null && y !== null && z !== null)
                    {
                        origin = { x, y, z };
                    }
                }

                if (!origin)
                {
                    origin = originFromMatrixElements(elements);
                }

                const zx = elements[8];
                const zy = elements[9];
                const zz = elements[10];
                const len = Math.hypot(zx, zy, zz);

                if (len > 1e-8)
                {
                    return {
                        origin,
                        z: { x: zx / len, y: zy / len, z: zz / len },
                    };
                }
            }
        }
        catch
        {
            void 0;
        }
    }

    const axes = readLocalAxesWorld(camera);

    return axes ? { origin: axes.origin, z: axes.z } : null;
}

function clipWorldEdgeToViewFront(
    view: View3DLike,
    a: Vec3,
    b: Vec3,
): { a: Vec3; b: Vec3 } | null
{
    const camera = view.camera;

    if (!camera)
    {
        return { a, b };
    }

    const axes = readViewCameraAxes(camera);

    if (!axes)
    {
        return { a, b };
    }

    const frontZ = viewFrontClipZ(camera);
    const za = cameraSpaceZ(a, axes.origin, axes.z);
    const zb = cameraSpaceZ(b, axes.origin, axes.z);
    const aFront = za < frontZ;
    const bFront = zb < frontZ;

    if (aFront && bFront)
    {
        return { a, b };
    }

    if (!aFront && !bFront)
    {
        return null;
    }

    const denom = zb - za;

    if (!(Math.abs(denom) > 1e-12))
    {
        return null;
    }

    const t = (frontZ - za) / denom;
    const clipped = lerpWorld(a, b, t);

    return aFront ? { a, b: clipped } : { a: clipped, b };
}

function readViewSize(view: View3DLike): { width: number; height: number }
{
    const sized = view as { width?: unknown; height?: unknown };
    const width = asFiniteNumber(sized.width);
    const height = asFiniteNumber(sized.height);

    return {
        width  : width !== null && width > 1 ? width : 1920,
        height : height !== null && height > 1 ? height : 1080,
    };
}

function clipScreenLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
): ScreenEdge | null
{
    if (
        !Number.isFinite(x1)
        || !Number.isFinite(y1)
        || !Number.isFinite(x2)
        || !Number.isFinite(y2)
    )
    {
        return null;
    }

    let t0 = 0;
    let t1 = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;

    const edges: Array<[number, number]> = [
        [-dx, x1 - minX],
        [dx, maxX - x1],
        [-dy, y1 - minY],
        [dy, maxY - y1],
    ];

    for (const [p, q] of edges)
    {
        if (!(Math.abs(p) > 1e-12))
        {
            if (q < 0)
            {
                return null;
            }

            continue;
        }

        const r = q / p;

        if (p < 0)
        {
            if (r > t1)
            {
                return null;
            }

            if (r > t0)
            {
                t0 = r;
            }
        }
        else
        {
            if (r < t0)
            {
                return null;
            }

            if (r < t1)
            {
                t1 = r;
            }
        }
    }

    return {
        x1 : x1 + (dx * t0),
        y1 : y1 + (dy * t0),
        x2 : x1 + (dx * t1),
        y2 : y1 + (dy * t1),
    };
}

export function projectWorldEdge(
    view: View3DLike,
    a: Vec3,
    b: Vec3,
    scaleX = 1,
    scaleY = 1,
): ScreenEdge | null
{
    const clipped = clipWorldEdgeToViewFront(view, a, b);

    if (!clipped)
    {
        return null;
    }

    const from = projectWorldPoint(view, clipped.a);
    const to = projectWorldPoint(view, clipped.b);

    if (!from || !to)
    {
        return null;
    }

    const { width, height } = readViewSize(view);
    const pad = Math.max(width, height) * SCREEN_PAD_FACTOR;
    const screen = clipScreenLine(
        from.x,
        from.y,
        to.x,
        to.y,
        -pad,
        -pad,
        width + pad,
        height + pad,
    );

    if (!screen)
    {
        return null;
    }

    return {
        x1 : screen.x1 * scaleX,
        y1 : screen.y1 * scaleY,
        x2 : screen.x2 * scaleX,
        y2 : screen.y2 * scaleY,
    };
}
