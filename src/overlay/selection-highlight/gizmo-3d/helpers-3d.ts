import { isCamera3D, readCamera3D } from '../../../page-ops/camera-3d';
import { isLight3D, lightSubtype, readLight3D } from '../../../page-ops/light-3d';
import { asFiniteNumber } from '../geometry';
import { addScaled, planeBasis } from '../math-3d';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { AxesWorld } from '../geometry-3d';
import type { Vec3 } from '../math-3d';

export type WorldEdge = {
    a: Vec3;
    b: Vec3;
};

const DEG_TO_RAD = Math.PI / 180;
const CAMERA_BODY = 0.18;
const CAMERA_LENS = 0.12;
const DIR_ARROW_LEN = 1.6;
const DIR_ARROW_HEAD = 0.28;
const DIR_CROSS = 0.35;
const POINT_CROSS = 0.25;
const SPOT_FALLBACK_RANGE = 4;
const RING_SEGMENTS = 24;
const CONE_SPOKES = 8;

function pushEdge(edges: Array<WorldEdge>, a: Vec3, b: Vec3)
{
    edges.push({ a, b });
}

function pushBox(
    edges: Array<WorldEdge>,
    center: Vec3,
    right: Vec3,
    up: Vec3,
    forward: Vec3,
    hx: number,
    hy: number,
    hz: number,
)
{
    const corner = (sx: number, sy: number, sz: number): Vec3 =>
        addScaled(
            addScaled(addScaled(center, right, sx * hx), up, sy * hy),
            forward,
            sz * hz,
        );

    const c000 = corner(-1, -1, -1);
    const c100 = corner(1, -1, -1);
    const c110 = corner(1, 1, -1);
    const c010 = corner(-1, 1, -1);
    const c001 = corner(-1, -1, 1);
    const c101 = corner(1, -1, 1);
    const c111 = corner(1, 1, 1);
    const c011 = corner(-1, 1, 1);

    pushEdge(edges, c000, c100);
    pushEdge(edges, c100, c110);
    pushEdge(edges, c110, c010);
    pushEdge(edges, c010, c000);
    pushEdge(edges, c001, c101);
    pushEdge(edges, c101, c111);
    pushEdge(edges, c111, c011);
    pushEdge(edges, c011, c001);
    pushEdge(edges, c000, c001);
    pushEdge(edges, c100, c101);
    pushEdge(edges, c110, c111);
    pushEdge(edges, c010, c011);
}

function pushRect(
    edges: Array<WorldEdge>,
    center: Vec3,
    right: Vec3,
    up: Vec3,
    halfW: number,
    halfH: number,
)
{
    const c00 = addScaled(addScaled(center, right, -halfW), up, -halfH);
    const c10 = addScaled(addScaled(center, right, halfW), up, -halfH);
    const c11 = addScaled(addScaled(center, right, halfW), up, halfH);
    const c01 = addScaled(addScaled(center, right, -halfW), up, halfH);

    pushEdge(edges, c00, c10);
    pushEdge(edges, c10, c11);
    pushEdge(edges, c11, c01);
    pushEdge(edges, c01, c00);

    return { c00, c10, c11, c01 };
}

function pushRing(
    edges: Array<WorldEdge>,
    center: Vec3,
    u: Vec3,
    v: Vec3,
    radius: number,
    segments: number,
)
{
    let prev: Vec3 | null = null;

    for (let i = 0; i <= segments; i++)
    {
        const t = (i / segments) * Math.PI * 2;
        const point = addScaled(
            addScaled(center, u, Math.cos(t) * radius),
            v,
            Math.sin(t) * radius,
        );

        if (prev)
        {
            pushEdge(edges, prev, point);
        }

        prev = point;
    }
}

function lookAxes(axes: AxesWorld): { forward: Vec3; right: Vec3; up: Vec3 }
{
    return {
        forward : { x: -axes.z.x, y: -axes.z.y, z: -axes.z.z },
        right   : axes.x,
        up      : axes.y,
    };
}

function readAspect(view: NonNullable<PixiNode['_view3d']>, fallback: number): number
{
    const sized = view as { width?: unknown; height?: unknown };
    const width = asFiniteNumber(sized.width);
    const height = asFiniteNumber(sized.height);

    if (width !== null && height !== null && height > 1e-6)
    {
        return width / height;
    }

    return fallback > 1e-6 ? fallback : 16 / 9;
}

function cameraWorldEdges(
    node: PixiNode,
    view: NonNullable<PixiNode['_view3d']>,
    axes: AxesWorld,
    aspectHint: number,
): Array<WorldEdge> | null
{
    const camera = readCamera3D(node);

    if (!camera)
    {
        return null;
    }

    const edges: Array<WorldEdge> = [];
    const { origin } = axes;
    const { forward, right, up } = lookAxes(axes);
    const aspect = readAspect(view, aspectHint);
    const near = Math.max(asFiniteNumber(camera.near) ?? 0.1, 1e-4);
    const far = Math.max(asFiniteNumber(camera.far) ?? 100, near + 1e-3);
    const zoom = Math.max(asFiniteNumber(camera.zoom) ?? 1, 1e-4);
    const mode = typeof camera.mode === 'string' ? camera.mode : 'perspective';

    let nearHalfW: number;
    let nearHalfH: number;
    let farHalfW: number;
    let farHalfH: number;

    if (mode === 'orthographic')
    {
        const halfW = Math.max((asFiniteNumber(camera.orthographicSize) ?? 5) / zoom, 1e-4);
        const halfH = halfW / aspect;

        nearHalfW = halfW;
        nearHalfH = halfH;
        farHalfW = halfW;
        farHalfH = halfH;
    }
    else
    {
        const fovDeg = asFiniteNumber(camera.fov) ?? 60;
        const fovRad = Math.max(Math.min(fovDeg, 179), 1) * DEG_TO_RAD;
        const halfFov = Math.atan(Math.tan(fovRad / 2) / zoom);
        const nearHalfHRaw = Math.tan(halfFov) * near;
        const farHalfHRaw = Math.tan(halfFov) * far;

        nearHalfH = nearHalfHRaw;
        nearHalfW = nearHalfHRaw * aspect;
        farHalfH = farHalfHRaw;
        farHalfW = farHalfHRaw * aspect;
    }

    const bodyHalf = CAMERA_BODY * 0.5;

    pushBox(edges, origin, right, up, forward, bodyHalf, bodyHalf * 0.7, bodyHalf * 0.6);

    const lensOffset = (bodyHalf * 0.6) + (CAMERA_LENS * 0.35);
    const lensCenter = addScaled(origin, forward, lensOffset);
    const lensRect = pushRect(edges, lensCenter, right, up, bodyHalf * 0.45, bodyHalf * 0.35);

    pushEdge(edges, addScaled(origin, forward, bodyHalf * 0.6), lensRect.c00);
    pushEdge(edges, addScaled(origin, forward, bodyHalf * 0.6), lensRect.c10);
    pushEdge(edges, addScaled(origin, forward, bodyHalf * 0.6), lensRect.c11);
    pushEdge(edges, addScaled(origin, forward, bodyHalf * 0.6), lensRect.c01);

    const nearCenter = addScaled(origin, forward, near);
    const farCenter = addScaled(origin, forward, far);
    const nearCorners = pushRect(edges, nearCenter, right, up, nearHalfW, nearHalfH);
    const farCorners = pushRect(edges, farCenter, right, up, farHalfW, farHalfH);

    pushEdge(edges, nearCorners.c00, farCorners.c00);
    pushEdge(edges, nearCorners.c10, farCorners.c10);
    pushEdge(edges, nearCorners.c11, farCorners.c11);
    pushEdge(edges, nearCorners.c01, farCorners.c01);

    return edges;
}

function directionalWorldEdges(axes: AxesWorld): Array<WorldEdge>
{
    const edges: Array<WorldEdge> = [];
    const { origin } = axes;
    const { forward, right, up } = lookAxes(axes);
    const tip = addScaled(origin, forward, DIR_ARROW_LEN);

    pushEdge(edges, origin, tip);
    pushEdge(edges, tip, addScaled(addScaled(tip, forward, -DIR_ARROW_HEAD), right, DIR_ARROW_HEAD * 0.45));
    pushEdge(edges, tip, addScaled(addScaled(tip, forward, -DIR_ARROW_HEAD), right, -DIR_ARROW_HEAD * 0.45));
    pushEdge(edges, tip, addScaled(addScaled(tip, forward, -DIR_ARROW_HEAD), up, DIR_ARROW_HEAD * 0.45));
    pushEdge(edges, tip, addScaled(addScaled(tip, forward, -DIR_ARROW_HEAD), up, -DIR_ARROW_HEAD * 0.45));

    pushEdge(edges, addScaled(origin, right, -DIR_CROSS), addScaled(origin, right, DIR_CROSS));
    pushEdge(edges, addScaled(origin, up, -DIR_CROSS), addScaled(origin, up, DIR_CROSS));

    return edges;
}

function pointWorldEdges(axes: AxesWorld, range: number): Array<WorldEdge>
{
    const edges: Array<WorldEdge> = [];
    const { origin, x, y, z } = axes;

    pushEdge(edges, addScaled(origin, x, -POINT_CROSS), addScaled(origin, x, POINT_CROSS));
    pushEdge(edges, addScaled(origin, y, -POINT_CROSS), addScaled(origin, y, POINT_CROSS));
    pushEdge(edges, addScaled(origin, z, -POINT_CROSS), addScaled(origin, z, POINT_CROSS));

    if (!(range > 1e-4))
    {
        return edges;
    }

    pushRing(edges, origin, x, y, range, RING_SEGMENTS);
    pushRing(edges, origin, x, z, range, RING_SEGMENTS);
    pushRing(edges, origin, y, z, range, RING_SEGMENTS);

    return edges;
}

function spotWorldEdges(axes: AxesWorld, coneAngleDeg: number, range: number): Array<WorldEdge>
{
    const edges: Array<WorldEdge> = [];
    const { origin } = axes;
    const { forward, right, up } = lookAxes(axes);
    const length = range > 1e-4 ? range : SPOT_FALLBACK_RANGE;
    const angle = Math.max(Math.min(coneAngleDeg, 89.5), 0.5) * DEG_TO_RAD;
    const radius = Math.tan(angle) * length;
    const base = addScaled(origin, forward, length);
    const basis = planeBasis(forward) ?? { u: right, v: up };

    pushRing(edges, base, basis.u, basis.v, radius, RING_SEGMENTS);

    for (let i = 0; i < CONE_SPOKES; i++)
    {
        const t = (i / CONE_SPOKES) * Math.PI * 2;
        const rim = addScaled(
            addScaled(base, basis.u, Math.cos(t) * radius),
            basis.v,
            Math.sin(t) * radius,
        );

        pushEdge(edges, origin, rim);
    }

    pushEdge(edges, origin, base);

    return edges;
}

export function helperWorldEdges(
    node: PixiNode,
    view: NonNullable<PixiNode['_view3d']>,
    axes: AxesWorld,
    aspectHint: number,
): Array<WorldEdge> | null
{
    if (isCamera3D(node))
    {
        return cameraWorldEdges(node, view, axes, aspectHint);
    }

    if (!isLight3D(node))
    {
        return null;
    }

    const subtype = lightSubtype(node);
    const light = readLight3D(node);
    const range = asFiniteNumber(light?.range) ?? 0;

    if (subtype === 'directional')
    {
        return directionalWorldEdges(axes);
    }

    if (subtype === 'point')
    {
        return pointWorldEdges(axes, range);
    }

    if (subtype === 'spot')
    {
        const coneAngle = asFiniteNumber(light?.coneAngle) ?? 60;

        return spotWorldEdges(axes, coneAngle, range);
    }

    return null;
}
