import { isView3D } from './node-3d';

import type { PixiNode } from './pixi-node';

export type HemisphereEnv = {
    skyColor: unknown;
    groundColor: unknown;
    intensity?: number;
    up?: unknown;
};

export type FogLike = {
    type?: string;
    color?: unknown;
    near?: number;
    far?: number;
    density?: number;
};

type View3DLike = PixiNode & {
    camera?: unknown;
    exposure?: number;
    toneMapping?: string;
    shadowQuality?: string;
    shadowFilter?: string;
    autoResize?: boolean;
    fog?: FogLike | null;
    environment?: unknown;
    background?: unknown;
    cull?: string;
    resolution?: number | 'inherit';
};

function asView(node: PixiNode): View3DLike
{
    return node as View3DLike;
}

export function isHemisphereEnv(value: unknown): value is HemisphereEnv
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const env = value as HemisphereEnv;

    return 'skyColor' in env && 'groundColor' in env;
}

export function readView3D(node: PixiNode): View3DLike | null
{
    return isView3D(node) ? asView(node) : null;
}

export function readHemisphereEnv(node: PixiNode): HemisphereEnv | null
{
    const view = readView3D(node);

    if (!view)
    {
        return null;
    }

    return isHemisphereEnv(view.environment) ? view.environment : null;
}

export function readFog(node: PixiNode): FogLike | null
{
    const view = readView3D(node);

    if (!view?.fog)
    {
        return null;
    }

    return view.fog;
}
