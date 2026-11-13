import { readTransformNumber, writeTransformNumber } from '../properties/transform-apply';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { NumberPropertyKey } from '../properties/node';
import type { NodeSnapshot } from './types';

export function snapshotNodeKeys(node: PixiNode, keys: Array<NumberPropertyKey>): Map<NumberPropertyKey, number>
{
    const values = new Map<NumberPropertyKey, number>();

    for (const key of keys)
    {
        const value = readTransformNumber(node, key);

        if (typeof value === 'number')
        {
            values.set(key, value);
        }
    }

    return values;
}

export function restoreNodeKeys(node: PixiNode, values: Map<NumberPropertyKey, number>)
{
    for (const [key, value] of values)
    {
        writeTransformNumber(node, key, value);
    }
}

export function snapshotNodesKeys(nodes: Array<PixiNode>, keys: Array<NumberPropertyKey>): Array<NodeSnapshot>
{
    const out: Array<NodeSnapshot> = [];

    for (const node of nodes)
    {
        const values = snapshotNodeKeys(node, keys);

        if (values.size > 0)
        {
            out.push({ node, values });
        }
    }

    return out;
}

export function restoreNodeSnapshots(snapshots: Array<NodeSnapshot>)
{
    for (const entry of snapshots)
    {
        restoreNodeKeys(entry.node, entry.values);
    }
}
