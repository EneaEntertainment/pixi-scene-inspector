import { isCamera3D } from './camera-3d';
import { isLight3D, isShadowCastingLight3D } from './light-3d';
import { isMeshShadow3D } from './mesh-props-3d';
import { isNode3D, isScene3D, isView3D } from './node-3d';
import { isSprite3D } from './sprite-3d';
import { typeNameOf } from './types';

import type { PixiNode } from './pixi-node';

export type NodeKind =
    | 'display2d'
    | 'view3d'
    | 'sceneRoot'
    | 'camera3d'
    | 'light'
    | 'mesh3d'
    | 'sprite3d'
    | 'container3d'
    | 'other3d';

const MESH_TYPE_NAMES = new Set([
    'Mesh3D',
    'Model3D',
    'BatchedMesh3D',
    'ParticleContainer3D',
]);

export function isAimable3D(node: PixiNode | null | undefined): boolean
{
    if (!node || typeof (node as { lookAt?: unknown }).lookAt !== 'function')
    {
        return false;
    }

    if (isCamera3D(node))
    {
        return true;
    }

    return isShadowCastingLight3D(node);
}

export function classifyNode(node: PixiNode): NodeKind
{
    if (isView3D(node))
    {
        return 'view3d';
    }

    if (isScene3D(node))
    {
        return 'sceneRoot';
    }

    if (isCamera3D(node))
    {
        return 'camera3d';
    }

    if (isLight3D(node))
    {
        return 'light';
    }

    if (isSprite3D(node))
    {
        return 'sprite3d';
    }

    if (isMeshShadow3D(node) || MESH_TYPE_NAMES.has(typeNameOf(node)))
    {
        return 'mesh3d';
    }

    if (isNode3D(node))
    {
        if (typeNameOf(node) === 'Container3D')
        {
            return 'container3d';
        }

        return 'other3d';
    }

    return 'display2d';
}
