import { mapsForNode } from './node';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { NumberPropertyKey } from './node';

export const MULTI_TRANSFORM_KEYS = new Set<NumberPropertyKey>([
    'position.x',
    'position.y',
    'scale.x',
    'scale.y',
    'rotation',
    'angle',
]);

export type TransformNumberCommitInfo = {
    source: 'input' | 'scrub' | 'nudge';
    previous: number | undefined;
};

function findNumberMapping(node: PixiNode, key: NumberPropertyKey)
{
    return mapsForNode(node).numbers.find((entry) => entry.key === key);
}

export function readTransformNumber(node: PixiNode, key: NumberPropertyKey): number | undefined
{
    return findNumberMapping(node, key)?.get();
}

export function writeTransformNumber(node: PixiNode, key: NumberPropertyKey, value: number)
{
    findNumberMapping(node, key)?.set(value);
}

export function applyTransformNumber(
    nodes: Array<PixiNode>,
    key: NumberPropertyKey,
    value: number,
    info: TransformNumberCommitInfo,
)
{
    if (nodes.length <= 1 || !MULTI_TRANSFORM_KEYS.has(key))
    {
        return;
    }

    const delta = value - (info.previous ?? 0);

    for (const node of nodes)
    {
        const mapping = findNumberMapping(node, key);

        if (!mapping)
        {
            continue;
        }

        if (info.source === 'input')
        {
            mapping.set(value);
        }
        else
        {
            const current = mapping.get();

            if (typeof current === 'number')
            {
                mapping.set(current + delta);
            }
        }
    }
}
