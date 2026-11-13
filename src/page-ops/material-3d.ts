import { resolveTextureByName, textureNameOf } from './texture';
import { isPixiTexture } from './texture/is-texture';

import type { PageGlobals, PixiNode, PixiTexture } from './pixi-node';

export const MATERIAL_ALPHA_MODES = new Set(['opaque', 'mask', 'blend']);

export type MaterialKind = 'pbr' | 'phong' | 'flat' | 'other';

export type MaterialTextureSlot =
    | 'baseColor'
    | 'metallicRoughness'
    | 'normal'
    | 'occlusion'
    | 'emissive'
    | 'specular';

export const MATERIAL_TEXTURE_SLOTS: Array<MaterialTextureSlot> = [
    'baseColor',
    'metallicRoughness',
    'normal',
    'occlusion',
    'emissive',
    'specular',
];

export type EmissiveLike = {
    color: unknown;
    strength: number;
    texture?: unknown;
};

type MaterialTexturesLike = {
    [slot: string]: unknown;
};

export type Material3DLike = {
    destroyed?: boolean;
    baseColor: unknown;
    alpha: number;
    alphaMode: string;
    alphaCutoff: number;
    metallic?: number;
    roughness?: number;
    normalScale?: number;
    occlusionStrength?: number;
    ior?: number;
    shininess?: number;
    specularColor?: unknown;
    specularStrength?: number;
    emissive?: EmissiveLike;
    textures?: MaterialTexturesLike;
    constructor?: { name?: string; EMPTY?: unknown };
};

type MeshMaterialHost = PixiNode & {
    material?: unknown;
};

function asHost(node: PixiNode): MeshMaterialHost
{
    return node as MeshMaterialHost;
}

function isEmptyMaterial(material: Material3DLike): boolean
{
    const empty = material.constructor?.EMPTY;

    return empty !== undefined && empty !== null && empty === material;
}

function materialCtorName(material: Material3DLike): string
{
    return material.constructor?.name ?? '';
}

function isColorSourceLike(value: unknown): boolean
{
    if (typeof value === 'number')
    {
        return Number.isFinite(value);
    }

    if (typeof value === 'string')
    {
        return value.trim() !== '';
    }

    if (Array.isArray(value))
    {
        return value.length >= 3
            && value.length <= 4
            && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
    }

    if (
        value instanceof Float32Array
        || value instanceof Uint8Array
        || value instanceof Uint8ClampedArray
    )
    {
        return value.length >= 3 && value.length <= 4;
    }

    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const record = value as Record<string, unknown>;

    return typeof record.toNumber === 'function' || typeof record.toHex === 'function';
}

function isMaterial3DLike(value: unknown): value is Material3DLike
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const material = value as Material3DLike;

    if (material.destroyed === true)
    {
        return false;
    }

    if (!isColorSourceLike(material.baseColor))
    {
        return false;
    }

    if (typeof material.alpha !== 'number')
    {
        return false;
    }

    if (typeof material.alphaMode !== 'string' || !MATERIAL_ALPHA_MODES.has(material.alphaMode))
    {
        return false;
    }

    if (typeof material.alphaCutoff !== 'number')
    {
        return false;
    }

    return !isEmptyMaterial(material);
}

export function readMaterial3D(node: PixiNode | null | undefined): Material3DLike | null
{
    if (!node)
    {
        return null;
    }

    const material = asHost(node).material;

    return isMaterial3DLike(material) ? material : null;
}

export function materialKind(material: Material3DLike): MaterialKind
{
    const name = materialCtorName(material);

    if (name === 'Material3D')
    {
        return 'pbr';
    }

    if (name === 'PhongMaterial')
    {
        return 'phong';
    }

    if (name === 'FlatMaterial')
    {
        return 'flat';
    }

    if (typeof material.metallic === 'number' && typeof material.roughness === 'number')
    {
        return 'pbr';
    }

    if (typeof material.shininess === 'number')
    {
        return 'phong';
    }

    return 'other';
}

export function readEmissive(material: Material3DLike): EmissiveLike | null
{
    const emissive = material.emissive;

    if (!emissive || typeof emissive !== 'object')
    {
        return null;
    }

    if (typeof emissive.strength !== 'number')
    {
        return null;
    }

    return emissive;
}

export function materialHasTextureSlot(material: Material3DLike, slot: MaterialTextureSlot): boolean
{
    const textures = material.textures;

    if (!textures || typeof textures !== 'object')
    {
        return false;
    }

    try
    {
        return slot in textures;
    }
    catch
    {
        return false;
    }
}

function readMaterialTexture(
    material: Material3DLike,
    slot: MaterialTextureSlot,
): PixiTexture | undefined
{
    if (!materialHasTextureSlot(material, slot))
    {
        return undefined;
    }

    try
    {
        const value = material.textures?.[slot];

        return isPixiTexture(value) ? value : undefined;
    }
    catch
    {
        return undefined;
    }
}

export function materialTextureName(
    material: Material3DLike,
    slot: MaterialTextureSlot,
    win: PageGlobals = globalThis as PageGlobals,
): string
{
    return textureNameOf(readMaterialTexture(material, slot), win);
}

export function setMaterialTextureByName(
    material: Material3DLike,
    slot: MaterialTextureSlot,
    name: string,
    win: PageGlobals = globalThis as PageGlobals,
): boolean
{
    if (!materialHasTextureSlot(material, slot))
    {
        return false;
    }

    const next = resolveTextureByName(name, win);

    if (!next)
    {
        return false;
    }

    const current = readMaterialTexture(material, slot);

    if (current === next)
    {
        return true;
    }

    try
    {
        if (!material.textures)
        {
            return false;
        }

        material.textures[slot] = next;

        return true;
    }
    catch
    {
        return false;
    }
}
