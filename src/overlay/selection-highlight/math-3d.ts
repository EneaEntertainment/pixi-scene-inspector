export type Vec3 = {
    x: number;
    y: number;
    z: number;
};

export function addScaled(a: Vec3, b: Vec3, s: number): Vec3
{
    return {
        x : a.x + (b.x * s),
        y : a.y + (b.y * s),
        z : a.z + (b.z * s),
    };
}

export function dot3(a: Vec3, b: Vec3): number
{
    return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
}

export function cross3(a: Vec3, b: Vec3): Vec3
{
    return {
        x : (a.y * b.z) - (a.z * b.y),
        y : (a.z * b.x) - (a.x * b.z),
        z : (a.x * b.y) - (a.y * b.x),
    };
}

export function sub3(a: Vec3, b: Vec3): Vec3
{
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function normalize3(v: Vec3): Vec3 | null
{
    const len = Math.hypot(v.x, v.y, v.z);

    if (!(len > 1e-8))
    {
        return null;
    }

    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function rayPlaneIntersection(
    ray: { origin: Vec3; direction: Vec3 },
    planePoint: Vec3,
    planeNormal: Vec3,
): Vec3 | null
{
    const denom = (ray.direction.x * planeNormal.x)
        + (ray.direction.y * planeNormal.y)
        + (ray.direction.z * planeNormal.z);

    if (!(Math.abs(denom) > 1e-8))
    {
        return null;
    }

    const t = (
        ((planePoint.x - ray.origin.x) * planeNormal.x)
        + ((planePoint.y - ray.origin.y) * planeNormal.y)
        + ((planePoint.z - ray.origin.z) * planeNormal.z)
    ) / denom;

    if (!(Number.isFinite(t)))
    {
        return null;
    }

    return {
        x : ray.origin.x + (ray.direction.x * t),
        y : ray.origin.y + (ray.direction.y * t),
        z : ray.origin.z + (ray.direction.z * t),
    };
}
