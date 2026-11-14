import { isCamera3D } from './camera-3d';
import { isLight3D } from './light-3d';
import { isView3D } from './node-3d';

import type { PixiNode } from './pixi-node';

type MeshShadowLike = PixiNode & {
    castShadow?: boolean;
    receiveShadow?: boolean;
    invalidate?: () => void;
};

type BillboardLike = PixiNode & {
    billboardMode: string;
};

function asMesh(node: PixiNode): MeshShadowLike
{
    return node as MeshShadowLike;
}

export function isMeshShadow3D(node: PixiNode | null | undefined): node is MeshShadowLike
{
    if (!node?._view3d)
    {
        return false;
    }

    if (isLight3D(node) || isCamera3D(node) || isView3D(node))
    {
        return false;
    }

    const mesh = asMesh(node);

    return typeof mesh.castShadow === 'boolean' || typeof mesh.receiveShadow === 'boolean';
}

export function isBillboard3D(node: PixiNode | null | undefined): node is BillboardLike
{
    return typeof node?.billboardMode === 'string';
}

export function readMeshShadow3D(node: PixiNode): MeshShadowLike | null
{
    return isMeshShadow3D(node) ? asMesh(node) : null;
}

export function readBillboard3D(node: PixiNode): BillboardLike | null
{
    return isBillboard3D(node) ? node : null;
}
