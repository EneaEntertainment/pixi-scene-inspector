import { typeNameOf } from './types';

import type { PixiNode } from './pixi-node';

const LIGHT_TYPE_NAMES = new Set([
    'DirectionalLight',
    'PointLight',
    'SpotLight',
    'AmbientLight',
    'Light',
]);

const LIGHT_TYPES = new Set([
    'directional',
    'point',
    'spot',
    'ambient',
]);

const AIM_LIGHT_TYPES = new Set([
    'directional',
    'spot',
]);

export type Vec3Target = {
    x: number;
    y: number;
    z: number;
};

type LightLike = PixiNode & {
    type?: string;
    color?: unknown;
    intensity?: number;
    castShadow?: boolean;
    range?: number;
    radius?: number;
    coneAngle?: number;
    penumbra?: number;
    lookAt?: (target: Vec3Target) => unknown;
};

export type LightSubtype =
    | 'directional'
    | 'point'
    | 'spot'
    | 'ambient'
    | 'unknown';

function asLight(node: PixiNode): LightLike
{
    return node as LightLike;
}

export function isLight3D(node: PixiNode | null | undefined): node is LightLike
{
    if (!node)
    {
        return false;
    }

    const light = asLight(node);
    const type = light.type;

    if (typeof light.intensity === 'number' && typeof type === 'string' && LIGHT_TYPES.has(type))
    {
        return true;
    }

    return LIGHT_TYPE_NAMES.has(typeNameOf(node));
}

export function isShadowCastingLight3D(node: PixiNode | null | undefined): boolean
{
    if (!isLight3D(node))
    {
        return false;
    }

    const light = asLight(node);
    const type = light.type;

    if (typeof type === 'string')
    {
        return AIM_LIGHT_TYPES.has(type);
    }

    const name = typeNameOf(node);

    return name === 'DirectionalLight' || name === 'SpotLight' || typeof light.coneAngle === 'number';
}

export function readLight3D(node: PixiNode): LightLike | null
{
    return isLight3D(node) ? asLight(node) : null;
}

export function lightSubtype(node: PixiNode): LightSubtype
{
    const type = asLight(node).type;

    if (typeof type === 'string' && LIGHT_TYPES.has(type))
    {
        return type as LightSubtype;
    }

    const name = typeNameOf(node);

    if (name === 'DirectionalLight')
    {
        return 'directional';
    }

    if (name === 'PointLight')
    {
        return 'point';
    }

    if (name === 'SpotLight')
    {
        return 'spot';
    }

    if (name === 'AmbientLight')
    {
        return 'ambient';
    }

    return 'unknown';
}

export function nodeLookAt(node: PixiNode, target: Vec3Target): boolean
{
    const lookAt = asLight(node).lookAt;

    if (typeof lookAt !== 'function')
    {
        return false;
    }

    try
    {
        lookAt.call(node, target);

        return true;
    }
    catch
    {
        return false;
    }
}
