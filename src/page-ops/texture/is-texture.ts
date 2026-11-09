import type { PixiNode, PixiTexture } from '../pixi-node';

export function isPixiTexture(value: unknown): value is PixiTexture
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const texture = value as PixiTexture;

    if (texture.isTexture === true)
    {
        return true;
    }

    if (texture.source && typeof texture.source === 'object')
    {
        return true;
    }

    return !!(texture.baseTexture && typeof texture.baseTexture === 'object');
}

export function nodeTexture(node: PixiNode | null | undefined): PixiTexture | undefined
{
    const texture = node?.texture;

    if (!isPixiTexture(texture))
    {
        return undefined;
    }

    return texture;
}

export function nodeHasTexture(node: PixiNode | null | undefined): boolean
{
    return !!nodeTexture(node);
}
