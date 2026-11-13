import {
    isShadowCastingLight3D,
    lightSubtype,
    type NodeKind,
} from '../../page-ops/props-3d';
import { canMapVisibleProp } from '../../page-ops/visibility';

import type { PixiNode } from '../../page-ops/pixi-node';

const INTERACTIVITY_KEYS = new Set([
    'eventMode',
    'cursor',
    'interactive',
    'buttonMode',
    'interactiveChildren',
]);

const CAMERA_SIZE_KEYS = new Set([
    'width',
    'height',
    'depth',
    'scale.x',
    'scale.y',
    'scale.z',
]);

const VIEW3D_DENIED_KEYS = new Set([
    'sortableChildren',
    'depth',
    'origin.x',
    'origin.y',
    'origin.z',
    'rotation.x',
    'rotation.y',
    'rotation.z',
    'angle.x',
    'angle.y',
    'angle.z',
]);

const POSITION_KEYS = new Set([
    'position.x',
    'position.y',
    'position.z',
]);

const ROTATION_KEYS = new Set([
    'rotation',
    'rotation.x',
    'rotation.y',
    'rotation.z',
    'angle',
    'angle.x',
    'angle.y',
    'angle.z',
]);

const BLEND_MODE_DENIED_3D = new Set([
    'mesh3d',
    'sprite3d',
    'container3d',
    'other3d',
    'sceneRoot',
    'camera3d',
    'light',
]);

function deniesLightTransform(key: string, node: PixiNode): boolean
{
    const subtype = lightSubtype(node);

    if (subtype === 'ambient')
    {
        return POSITION_KEYS.has(key) || ROTATION_KEYS.has(key);
    }

    if (subtype === 'point')
    {
        return ROTATION_KEYS.has(key);
    }

    return false;
}

export function shouldMapProp(kind: NodeKind, key: string, node: PixiNode): boolean
{
    if (key === 'visible')
    {
        return canMapVisibleProp(node);
    }

    if (kind === 'camera3d')
    {
        if (INTERACTIVITY_KEYS.has(key) || CAMERA_SIZE_KEYS.has(key))
        {
            return false;
        }
    }

    if (kind === 'view3d' && VIEW3D_DENIED_KEYS.has(key))
    {
        return false;
    }

    if (kind === 'light')
    {
        if (key === 'light.castShadow' && !isShadowCastingLight3D(node))
        {
            return false;
        }

        if (deniesLightTransform(key, node))
        {
            return false;
        }
    }

    if (key === 'blendMode' && BLEND_MODE_DENIED_3D.has(kind))
    {
        return false;
    }

    return true;
}
