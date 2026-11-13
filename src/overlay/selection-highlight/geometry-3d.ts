import { readMatrix4Elements } from '../../page-ops/node-3d';
import { asFiniteNumber } from './geometry';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { Vec3 } from './math-3d';

type View3DLike = NonNullable<PixiNode['_view3d']>;

export type LocalBounds3D = {
    min: Vec3;
    max: Vec3;
};

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

function transformLocalToWorld(elements: ArrayLike<number>, x: number, y: number, z: number): Vec3
{
    return {
        x : (elements[0] * x) + (elements[4] * y) + (elements[8] * z) + elements[12],
        y : (elements[1] * x) + (elements[5] * y) + (elements[9] * z) + elements[13],
        z : (elements[2] * x) + (elements[6] * y) + (elements[10] * z) + elements[14],
    };
}

function readVec3Corner(value: unknown): Vec3 | null
{
    if (!value || typeof value !== 'object')
    {
        return null;
    }

    const point = value as { x?: unknown; y?: unknown; z?: unknown };
    const x = asFiniteNumber(point.x);
    const y = asFiniteNumber(point.y);
    const z = asFiniteNumber(point.z);

    if (x === null || y === null || z === null)
    {
        return null;
    }

    return { x, y, z };
}

export function readLocalBounds3D(node: PixiNode): LocalBounds3D | null
{
    if (typeof node.getLocalBounds !== 'function')
    {
        return null;
    }

    try
    {
        const bounds = node.getLocalBounds() as {
            min?: unknown;
            max?: unknown;
        } | null | undefined;

        if (!bounds || typeof bounds !== 'object')
        {
            return null;
        }

        const min = readVec3Corner(bounds.min);
        const max = readVec3Corner(bounds.max);

        if (!min || !max)
        {
            return null;
        }

        if (max.x < min.x || max.y < min.y || max.z < min.z)
        {
            return null;
        }

        return { min, max };
    }
    catch
    {
        return null;
    }
}

export function localBoundsWorldCorners(node: PixiNode): Array<Vec3> | null
{
    const bounds = readLocalBounds3D(node);
    const elements = readMatrix4Elements(node);

    if (!bounds || !elements)
    {
        return null;
    }

    const { min, max } = bounds;

    return [
        transformLocalToWorld(elements, min.x, min.y, min.z),
        transformLocalToWorld(elements, max.x, min.y, min.z),
        transformLocalToWorld(elements, max.x, max.y, min.z),
        transformLocalToWorld(elements, min.x, max.y, min.z),
        transformLocalToWorld(elements, min.x, min.y, max.z),
        transformLocalToWorld(elements, max.x, min.y, max.z),
        transformLocalToWorld(elements, max.x, max.y, max.z),
        transformLocalToWorld(elements, min.x, max.y, max.z),
    ];
}

export function localBoundsScreenEdges(
    node: PixiNode,
    view: View3DLike,
    scaleX: number,
    scaleY: number,
): Array<{ x1: number; y1: number; x2: number; y2: number }>
{
    const corners = localBoundsWorldCorners(node);

    if (!corners)
    {
        return [];
    }

    const screens: Array<{ x: number; y: number } | null> = corners.map((corner) =>
    {
        const screen = projectWorldPoint(view, corner);

        if (!screen)
        {
            return null;
        }

        return {
            x : screen.x * scaleX,
            y : screen.y * scaleY,
        };
    });

    const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (const [a, b] of BOX_EDGE_INDICES)
    {
        const from = screens[a];
        const to = screens[b];

        if (!from || !to)
        {
            continue;
        }

        edges.push({
            x1 : from.x,
            y1 : from.y,
            x2 : to.x,
            y2 : to.y,
        });
    }

    return edges;
}

export function projectWorldPoint(view: View3DLike, world: Vec3): { x: number; y: number } | null
{
    if (typeof view.worldToScreen !== 'function')
    {
        return null;
    }

    try
    {
        const screen = view.worldToScreen(world);

        if (!screen)
        {
            return null;
        }

        const x = asFiniteNumber(screen.x);
        const y = asFiniteNumber(screen.y);

        if (x === null || y === null)
        {
            return null;
        }

        return { x, y };
    }
    catch
    {
        return null;
    }
}

export function readNodeGlobalPosition3D(node: PixiNode): Vec3 | null
{
    if (typeof node.getGlobalPosition === 'function')
    {
        try
        {
            const world = node.getGlobalPosition() as Vec3;
            const x = asFiniteNumber(world?.x);
            const y = asFiniteNumber(world?.y);
            const z = asFiniteNumber(world?.z);

            if (x === null || y === null || z === null)
            {
                return null;
            }

            return { x, y, z };
        }
        catch
        {
            return null;
        }
    }

    const elements = readMatrix4Elements(node);

    if (!elements)
    {
        return null;
    }

    return transformLocalToWorld(elements, 0, 0, 0);
}

export function cameraDistanceToWorld(view: View3DLike, world: Vec3): number
{
    const camera = view.camera;

    if (camera && typeof camera.getGlobalPosition === 'function')
    {
        try
        {
            const cam = camera.getGlobalPosition() as Vec3;
            const x = asFiniteNumber(cam?.x);
            const y = asFiniteNumber(cam?.y);
            const z = asFiniteNumber(cam?.z);

            if (x !== null && y !== null && z !== null)
            {
                const dist = Math.hypot(world.x - x, world.y - y, world.z - z);

                if (dist > 1e-6)
                {
                    return dist;
                }
            }
        }
        catch
        {
            void 0;
        }
    }

    const fallback = Math.hypot(world.x, world.y, world.z);

    return fallback > 1e-6 ? fallback : 1;
}

export function screenToWorldAtDistance(view: View3DLike, screen: { x: number; y: number }, distance: number): Vec3 | null
{
    if (typeof view.screenToWorld !== 'function')
    {
        return null;
    }

    try
    {
        const world = view.screenToWorld(screen, distance) as Vec3 | null;

        if (!world)
        {
            return null;
        }

        const x = asFiniteNumber(world.x);
        const y = asFiniteNumber(world.y);
        const z = asFiniteNumber(world.z);

        if (x === null || y === null || z === null)
        {
            return null;
        }

        return { x, y, z };
    }
    catch
    {
        return null;
    }
}

export function worldToParentLocal3D(node: PixiNode, world: Vec3): Vec3 | null
{
    const parent = node.parent;

    if (!parent)
    {
        return { ...world };
    }

    if (typeof parent.toLocal === 'function')
    {
        try
        {
            const local = parent.toLocal(world) as Vec3;
            const x = asFiniteNumber(local?.x);
            const y = asFiniteNumber(local?.y);
            const z = asFiniteNumber(local?.z);

            if (x === null || y === null || z === null)
            {
                return null;
            }

            return { x, y, z };
        }
        catch
        {
            return null;
        }
    }

    return null;
}

export function readLocalAxesWorld(node: PixiNode): { origin: Vec3; x: Vec3; y: Vec3; z: Vec3 } | null
{
    const elements = readMatrix4Elements(node);
    const origin = readNodeGlobalPosition3D(node);

    if (!elements || !origin)
    {
        return null;
    }

    const axis = (ix: number, iy: number, iz: number): Vec3 =>
    {
        const x = (elements[0] * ix) + (elements[4] * iy) + (elements[8] * iz);
        const y = (elements[1] * ix) + (elements[5] * iy) + (elements[9] * iz);
        const z = (elements[2] * ix) + (elements[6] * iy) + (elements[10] * iz);
        const len = Math.hypot(x, y, z);

        if (!(len > 1e-8))
        {
            return { x: ix, y: iy, z: iz };
        }

        return { x: x / len, y: y / len, z: z / len };
    };

    return {
        origin,
        x : axis(1, 0, 0),
        y : axis(0, 1, 0),
        z : axis(0, 0, 1),
    };
}

export function rayFromScreen(view: View3DLike, screen: { x: number; y: number }): { origin: Vec3; direction: Vec3 } | null
{
    if (typeof view.screenToRay !== 'function')
    {
        return null;
    }

    try
    {
        const ray = view.screenToRay(screen);
        const ox = asFiniteNumber(ray?.origin?.x);
        const oy = asFiniteNumber(ray?.origin?.y);
        const oz = asFiniteNumber(ray?.origin?.z);
        const dx = asFiniteNumber(ray?.direction?.x);
        const dy = asFiniteNumber(ray?.direction?.y);
        const dz = asFiniteNumber(ray?.direction?.z);

        if (
            ox === null
            || oy === null
            || oz === null
            || dx === null
            || dy === null
            || dz === null
        )
        {
            return null;
        }

        return {
            origin    : { x: ox, y: oy, z: oz },
            direction : { x: dx, y: dy, z: dz },
        };
    }
    catch
    {
        return null;
    }
}
