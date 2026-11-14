import { isNode3D } from './node-3d';

import type { PixiNode } from './pixi-node';

export type Euler3 = {
    x: number;
    y: number;
    z: number;
};

export type QuaternionLike = {
    x: number;
    y: number;
    z: number;
    w: number;
};

export type Axis3 = {
    x: number;
    y: number;
    z: number;
};

function readQuaternion(node: PixiNode): QuaternionLike | null
{
    const quaternion = (node as PixiNode & { quaternion?: unknown; }).quaternion;

    if (!quaternion || typeof quaternion !== 'object')
    {
        return null;
    }

    const q = quaternion as Partial<QuaternionLike>;

    if (
        typeof q.x !== 'number'
        || typeof q.y !== 'number'
        || typeof q.z !== 'number'
        || typeof q.w !== 'number'
    )
    {
        return null;
    }

    if (![q.x, q.y, q.z, q.w].every(Number.isFinite))
    {
        return null;
    }

    return { x: q.x, y: q.y, z: q.z, w: q.w };
}

function isRotationDirty(node: PixiNode): boolean
{
    return (node as PixiNode & { rotationDirty?: unknown; }).rotationDirty === true;
}

function quaternionFromEulerXYZ(euler: Euler3): QuaternionLike
{
    const halfX = euler.x * 0.5;
    const halfY = euler.y * 0.5;
    const halfZ = euler.z * 0.5;
    const c1 = Math.cos(halfX);
    const c2 = Math.cos(halfY);
    const c3 = Math.cos(halfZ);
    const s1 = Math.sin(halfX);
    const s2 = Math.sin(halfY);
    const s3 = Math.sin(halfZ);

    return {
        x : (s1 * c2 * c3) + (c1 * s2 * s3),
        y : (c1 * s2 * c3) - (s1 * c2 * s3),
        z : (c1 * c2 * s3) + (s1 * s2 * c3),
        w : (c1 * c2 * c3) - (s1 * s2 * s3),
    };
}

function normalizeQuaternion(q: QuaternionLike): QuaternionLike
{
    const len = Math.hypot(q.x, q.y, q.z, q.w);

    if (!(len > 0))
    {
        return { x: 0, y: 0, z: 0, w: 1 };
    }

    const inv = 1 / len;

    return {
        x : q.x * inv,
        y : q.y * inv,
        z : q.z * inv,
        w : q.w * inv,
    };
}

function quaternionsAlmostEqual(a: QuaternionLike, b: QuaternionLike): boolean
{
    const dot = (a.x * b.x) + (a.y * b.y) + (a.z * b.z) + (a.w * b.w);

    return Math.abs(dot) > 0.999999;
}

function storedEulerMatchesQuaternion(euler: Euler3, quaternion: QuaternionLike): boolean
{
    return quaternionsAlmostEqual(quaternionFromEulerXYZ(euler), quaternion);
}

export function eulerXYZFromQuaternion(q: QuaternionLike): Euler3
{
    const { x, y, z, w } = q;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    const m00 = 1 - (yy + zz);
    const m01 = xy - wz;
    const m02 = xz + wy;
    const m11 = 1 - (xx + zz);
    const m12 = yz - wx;
    const m21 = yz + wx;
    const m22 = 1 - (xx + yy);

    const pitch = Math.asin(Math.max(-1, Math.min(1, m02)));

    if (Math.abs(m02) < 0.9999999)
    {
        return {
            x : Math.atan2(-m12, m22),
            y : pitch,
            z : Math.atan2(-m01, m00),
        };
    }

    return {
        x : Math.atan2(m21, m11),
        y : pitch,
        z : 0,
    };
}

function readStoredEulerRadians(node: PixiNode): Euler3 | null
{
    const rotation = node.rotation;

    if (!rotation || typeof rotation === 'number' || typeof rotation !== 'object')
    {
        return null;
    }

    const x = rotation.x;
    const y = rotation.y;
    const z = rotation.z;

    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number')
    {
        return null;
    }

    if (![x, y, z].every(Number.isFinite))
    {
        return null;
    }

    return { x, y, z };
}

export function snapshotQuaternion(node: PixiNode): QuaternionLike | null
{
    if (!isNode3D(node))
    {
        return null;
    }

    if (isRotationDirty(node))
    {
        const euler = readStoredEulerRadians(node);

        if (euler)
        {
            return quaternionFromEulerXYZ(euler);
        }
    }

    const quaternion = readQuaternion(node);

    if (quaternion)
    {
        return quaternion;
    }

    const euler = readStoredEulerRadians(node);

    return euler ? quaternionFromEulerXYZ(euler) : null;
}

export function writeQuaternion(node: PixiNode, q: QuaternionLike): boolean
{
    if (!isNode3D(node))
    {
        return false;
    }

    const current = (node as PixiNode & { quaternion?: unknown; }).quaternion;

    if (!current || typeof current !== 'object')
    {
        return false;
    }

    const next = normalizeQuaternion(q);
    const writable = current as QuaternionLike & {
        set?: (x: number, y: number, z: number, w: number) => unknown;
    };

    try
    {
        if (typeof writable.set === 'function')
        {
            writable.set(next.x, next.y, next.z, next.w);
        }
        else
        {
            writable.x = next.x;
            writable.y = next.y;
            writable.z = next.z;
            writable.w = next.w;
        }

        if ((node as PixiNode & { rotationDirty?: unknown; }).rotationDirty === true)
        {
            (node as PixiNode & { quaternion: QuaternionLike; }).quaternion = {
                x : next.x,
                y : next.y,
                z : next.z,
                w : next.w,
            };
        }
    }
    catch
    {
        return false;
    }

    return true;
}

export function applyLocalAxisRotation(
    start: QuaternionLike,
    axis: Axis3,
    deltaRad: number,
): QuaternionLike
{
    const half = deltaRad * 0.5;
    const s = Math.sin(half);
    const dx = axis.x * s;
    const dy = axis.y * s;
    const dz = axis.z * s;
    const dw = Math.cos(half);

    const qax = start.x;
    const qay = start.y;
    const qaz = start.z;
    const qaw = start.w;

    return normalizeQuaternion({
        x : (qax * dw) + (qaw * dx) + (qay * dz) - (qaz * dy),
        y : (qay * dw) + (qaw * dy) + (qaz * dx) - (qax * dz),
        z : (qaz * dw) + (qaw * dz) + (qax * dy) - (qay * dx),
        w : (qaw * dw) - (qax * dx) - (qay * dy) - (qaz * dz),
    });
}

export function readEffectiveEulerRadians(node: PixiNode): Euler3 | null
{
    if (!isNode3D(node))
    {
        return null;
    }

    const stored = readStoredEulerRadians(node);
    const quaternion = readQuaternion(node);

    if (isRotationDirty(node) && stored)
    {
        return stored;
    }

    if (stored && quaternion && storedEulerMatchesQuaternion(stored, quaternion))
    {
        return stored;
    }

    if (quaternion)
    {
        return eulerXYZFromQuaternion(quaternion);
    }

    return stored;
}

function writeEulerRadians(node: PixiNode, euler: Euler3): boolean
{
    const rotation = node.rotation;

    if (!rotation || typeof rotation === 'number' || typeof rotation !== 'object')
    {
        return false;
    }

    const writable = rotation as PixiNode['rotation'] & {
        set?: (x?: number, y?: number, z?: number) => unknown;
    };

    try
    {
        if (typeof writable.set === 'function')
        {
            writable.set(euler.x, euler.y, euler.z);
        }
        else
        {
            rotation.x = euler.x;
            rotation.y = euler.y;
            rotation.z = euler.z;
        }

        if (!isRotationDirty(node))
        {
            node.rotation = {
                x : euler.x,
                y : euler.y,
                z : euler.z,
            };
        }
    }
    catch
    {
        return false;
    }

    return true;
}

export function setEulerAxisRadians(
    node: PixiNode,
    axis: 'x' | 'y' | 'z',
    radians: number,
): boolean
{
    if (!isNode3D(node) || !Number.isFinite(radians))
    {
        return false;
    }

    const euler = readEffectiveEulerRadians(node);

    if (!euler)
    {
        return false;
    }

    return writeEulerRadians(node, {
        x : axis === 'x' ? radians : euler.x,
        y : axis === 'y' ? radians : euler.y,
        z : axis === 'z' ? radians : euler.z,
    });
}
