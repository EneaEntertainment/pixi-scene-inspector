import { typeNameOf } from './types';

import type { PixiNode } from './pixi-node';

export type Sprite3DLike = PixiNode & {
    pixelSize: number;
    material?: unknown;
};

export function isSprite3D(node: PixiNode | null | undefined): node is Sprite3DLike
{
    if (!node)
    {
        return false;
    }

    const sprite = node as Sprite3DLike;

    if (typeNameOf(node) === 'Sprite3D')
    {
        return typeof sprite.pixelSize === 'number';
    }

    return typeof sprite.pixelSize === 'number'
        && typeof node.billboardMode === 'string'
        && sprite.material !== undefined
        && sprite.material !== null;
}

export function readSprite3D(node: PixiNode | null | undefined): Sprite3DLike | null
{
    return isSprite3D(node) ? node : null;
}
