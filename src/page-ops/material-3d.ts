import { resolveTextureByName, textureNameOf } from './texture';
import { isPixiTexture } from './texture/is-texture';

import type { PageGlobals, PixiNode, PixiTexture } from './pixi-node';

export const MATERIAL_ALPHA_MODES = new Set(['opaque', 'mask', 'blend']);

export type MaterialKind = 'pbr' | 'phong' | 'flat' | 'toon' | 'other';

export type MaterialTextureSlot =
    | 'baseColor'
    | 'metallicRoughness'
    | 'normal'
    | 'occlusion'
    | 'emissive'
    | 'specular'
    | 'clearcoat'
    | 'clearcoatRoughness'
    | 'clearcoatNormal'
    | 'sheen'
    | 'transmission'
    | 'thickness'
    | 'iridescence'
    | 'anisotropy';

export const MATERIAL_TEXTURE_SLOTS: Array<MaterialTextureSlot> = [
    'baseColor',
    'metallicRoughness',
    'normal',
    'occlusion',
    'emissive',
    'specular',
    'clearcoat',
    'clearcoatRoughness',
    'clearcoatNormal',
    'sheen',
    'transmission',
    'thickness',
    'iridescence',
    'anisotropy',
];

export type EmissiveLike = {
    color: unknown;
    strength: number;
    texture?: unknown;
};

export type SpecularGroupLike = {
    factor: number;
    color: unknown;
    texture?: unknown;
};

export type ClearcoatLike = {
    factor: number;
    roughness: number;
    normalScale: number;
    texture?: unknown;
    roughnessTexture?: unknown;
    normalTexture?: unknown;
};

export type SheenLike = {
    color: unknown;
    roughness: number;
    texture?: unknown;
};

export type TransmissionLike = {
    factor: number;
    thickness: number;
    attenuationDistance: number;
    attenuationColor: unknown;
    texture?: unknown;
    thicknessTexture?: unknown;
};

export type IridescenceLike = {
    factor: number;
    ior: number;
    thicknessMinimum: number;
    thicknessMaximum: number;
    texture?: unknown;
};

export type AnisotropyLike = {
    strength: number;
    rotation: number;
    texture?: unknown;
};

export type UvTransformLike = {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
};

type MaterialTexturesLike = {
    [slot: string]: unknown;
};

type MaterialDataLike = {
    uvTransformRow0?: unknown;
    bands?: number;
    specularSize?: number;
    rimPower?: number;
    rimIntensity?: number;
};

export type Material3DLike = {
    destroyed?: boolean;
    label?: unknown;
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
    doubleSided?: boolean;
    flatShading?: boolean;
    fog?: boolean;
    vertexColors?: boolean;
    emissive?: EmissiveLike;
    specular?: SpecularGroupLike;
    clearcoat?: ClearcoatLike;
    sheen?: SheenLike;
    transmission?: TransmissionLike;
    iridescence?: IridescenceLike;
    anisotropy?: AnisotropyLike;
    uvTransform?: UvTransformLike | null;
    data?: MaterialDataLike;
    textures?: MaterialTexturesLike;
    constructor?: { name?: string; EMPTY?: unknown };
};

type MeshMaterialHost = PixiNode & {
    material?: unknown;
    invalidate?: () => void;
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

function isUvTransformLike(value: unknown): value is UvTransformLike
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const matrix = value as UvTransformLike;

    return typeof matrix.a === 'number'
        && typeof matrix.b === 'number'
        && typeof matrix.c === 'number'
        && typeof matrix.d === 'number'
        && typeof matrix.tx === 'number'
        && typeof matrix.ty === 'number';
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

    if (name === 'ToonMaterial')
    {
        return 'toon';
    }

    if (typeof material.metallic === 'number' && typeof material.roughness === 'number')
    {
        return 'pbr';
    }

    if (typeof material.shininess === 'number')
    {
        return 'phong';
    }

    const data = material.data;

    if (data && typeof data.bands === 'number')
    {
        return 'toon';
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

export function readSpecularGroup(material: Material3DLike): SpecularGroupLike | null
{
    const specular = material.specular;

    if (!specular || typeof specular !== 'object')
    {
        return null;
    }

    if (typeof specular.factor !== 'number')
    {
        return null;
    }

    return specular;
}

export function readClearcoat(material: Material3DLike): ClearcoatLike | null
{
    const clearcoat = material.clearcoat;

    if (!clearcoat || typeof clearcoat !== 'object')
    {
        return null;
    }

    if (typeof clearcoat.factor !== 'number' || typeof clearcoat.roughness !== 'number')
    {
        return null;
    }

    return clearcoat;
}

export function readSheen(material: Material3DLike): SheenLike | null
{
    const sheen = material.sheen;

    if (!sheen || typeof sheen !== 'object')
    {
        return null;
    }

    if (typeof sheen.roughness !== 'number')
    {
        return null;
    }

    return sheen;
}

export function readTransmission(material: Material3DLike): TransmissionLike | null
{
    const transmission = material.transmission;

    if (!transmission || typeof transmission !== 'object')
    {
        return null;
    }

    if (typeof transmission.factor !== 'number' || typeof transmission.thickness !== 'number')
    {
        return null;
    }

    return transmission;
}

export function readIridescence(material: Material3DLike): IridescenceLike | null
{
    const iridescence = material.iridescence;

    if (!iridescence || typeof iridescence !== 'object')
    {
        return null;
    }

    if (typeof iridescence.factor !== 'number' || typeof iridescence.ior !== 'number')
    {
        return null;
    }

    return iridescence;
}

export function readAnisotropy(material: Material3DLike): AnisotropyLike | null
{
    const anisotropy = material.anisotropy;

    if (!anisotropy || typeof anisotropy !== 'object')
    {
        return null;
    }

    if (typeof anisotropy.strength !== 'number' || typeof anisotropy.rotation !== 'number')
    {
        return null;
    }

    return anisotropy;
}

export function materialSupportsUvTransform(material: Material3DLike): boolean
{
    const data = material.data;

    return !!data && typeof data === 'object' && 'uvTransformRow0' in data;
}

export function readUvTransform(material: Material3DLike): UvTransformLike
{
    const current = material.uvTransform;

    if (isUvTransformLike(current))
    {
        return current;
    }

    return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

export function writeUvTransform(material: Material3DLike, patch: Partial<UvTransformLike>)
{
    if (!materialSupportsUvTransform(material))
    {
        return;
    }

    const current = readUvTransform(material);

    material.uvTransform = {
        a  : patch.a ?? current.a,
        b  : patch.b ?? current.b,
        c  : patch.c ?? current.c,
        d  : patch.d ?? current.d,
        tx : patch.tx ?? current.tx,
        ty : patch.ty ?? current.ty,
    };
}

export function readToonData(material: Material3DLike): MaterialDataLike | null
{
    if (materialKind(material) !== 'toon')
    {
        return null;
    }

    const data = material.data;

    if (!data || typeof data !== 'object')
    {
        return null;
    }

    return data;
}

export function invalidateMaterialHost(node: PixiNode)
{
    const host = asHost(node);

    if (typeof host.invalidate === 'function')
    {
        host.invalidate();
    }
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
