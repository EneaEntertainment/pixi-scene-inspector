import { appendCameraMaps } from './camera';
import { appendLightMaps } from './light';
import { appendMaterialMaps } from './material';
import { appendMeshMaps } from './mesh';
import { appendShadowMaps } from './shadow';
import { appendSpriteMaps } from './sprite';
import { appendView3DMaps } from './view3d';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { PropertyMapping } from '../map-helpers';
import type { AppendMapsContext } from './helpers';

export function appendThreeDPropertyMaps(
    node: PixiNode,
    allow: (key: string) => boolean,
    numbers: Array<PropertyMapping<number>>,
    booleans: Array<PropertyMapping<boolean>>,
    strings: Array<PropertyMapping<string>>,
): void
{
    const ctx: AppendMapsContext = { allow, numbers, booleans, strings };

    appendLightMaps(node, ctx);
    appendShadowMaps(node, ctx);
    appendCameraMaps(node, ctx);
    appendView3DMaps(node, ctx);
    appendMeshMaps(node, ctx);
    appendSpriteMaps(node, ctx);
    appendMaterialMaps(node, ctx);
}
