import { typeNameOf } from './types';
import { readView3D } from './view-props-3d';

import type { Vec3Target } from './light-3d';
import type { PixiNode } from './pixi-node';

type CameraLike = PixiNode & {
    fov?: number;
    zoom?: number;
    near?: number;
    far?: number;
    mode?: string;
    orthographicSize?: number;
    lookAt?: (target: Vec3Target) => unknown;
    renderTexture?: unknown;
    resetHistory?: () => void;
};

type ViewCameraStatus = 'active' | 'ready' | 'unavailable';

export type OrbitCameraLike = {
    autoRotate: boolean;
    autoRotateSpeed?: number;
    enableDamping?: boolean;
    autoUpdate?: boolean;
    view?: unknown;
    camera?: unknown;
    target?: unknown;
    update?: (ticker?: unknown) => boolean;
};

function asCamera(node: PixiNode): CameraLike
{
    return node as CameraLike;
}

export function isCamera3D(node: PixiNode | null | undefined): node is CameraLike
{
    if (!node)
    {
        return false;
    }

    if (typeNameOf(node) === 'Camera3D')
    {
        return true;
    }

    return node._view3d?.camera === node;
}

export function readCamera3D(node: PixiNode): CameraLike | null
{
    return isCamera3D(node) ? asCamera(node) : null;
}

function isOrbitCameraLike(value: unknown, view: unknown, camera: unknown): value is OrbitCameraLike
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const orbit = value as OrbitCameraLike;

    if (typeof orbit.autoRotate !== 'boolean' || typeof orbit.update !== 'function')
    {
        return false;
    }

    return orbit.view === view || orbit.camera === camera;
}

function readOrbitFromHost(host: object | null | undefined, view: unknown, camera: unknown): OrbitCameraLike | null
{
    if (!host)
    {
        return null;
    }

    const named = host as Record<string, unknown>;

    for (const key of ['orbitCamera', 'orbit', 'controls'])
    {
        const value = named[key];

        if (isOrbitCameraLike(value, view, camera))
        {
            return value;
        }
    }

    return null;
}

export function readOrbitCamera(node: PixiNode): OrbitCameraLike | null
{
    const camera = readCamera3D(node);
    const viewFromCamera = camera?._view3d as PixiNode | undefined;
    const view = (viewFromCamera ? readView3D(viewFromCamera) : null) ?? readView3D(node);

    if (!view)
    {
        return null;
    }

    const hostCamera = camera ?? (view.camera as CameraLike | null | undefined) ?? null;

    return readOrbitFromHost(view, view, hostCamera)
        ?? readOrbitFromHost(hostCamera, view, hostCamera);
}

function readCameraView(camera: CameraLike)
{
    const viewFromCamera = camera._view3d as PixiNode | undefined;

    return viewFromCamera ? readView3D(viewFromCamera) : null;
}

export function viewCameraStatus(node: PixiNode): ViewCameraStatus
{
    const camera = readCamera3D(node);

    if (!camera)
    {
        return 'unavailable';
    }

    const view = readCameraView(camera);

    if (!view)
    {
        return 'unavailable';
    }

    if (view.camera === camera)
    {
        return 'active';
    }

    if (camera.renderTexture || camera.visible === false)
    {
        return 'unavailable';
    }

    return 'ready';
}

export function setAsViewCamera(node: PixiNode): boolean
{
    const status = viewCameraStatus(node);

    if (status === 'active')
    {
        return true;
    }

    if (status !== 'ready')
    {
        return false;
    }

    const camera = readCamera3D(node);
    const view = camera ? readCameraView(camera) : null;

    if (!camera || !view)
    {
        return false;
    }

    try
    {
        (view as { camera: CameraLike }).camera = camera;
    }
    catch
    {
        return false;
    }

    camera.resetHistory?.();

    return view.camera === camera;
}
