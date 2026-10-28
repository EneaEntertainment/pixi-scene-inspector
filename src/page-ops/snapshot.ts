import { childrenOf, findRoot } from './root';
import { customLabelOf, isPixi8, typeNameOf } from './types';

import type { SnapshotResult, TreeNodeData } from '../types';
import type { PageGlobals, PixiNode } from './pixi-node';

const MAX_DEPTH = 40;
const MAX_NODES = 2500;

const nodeUids = new WeakMap<object, number>();
let nextUid = 1;

function uidOf(node: PixiNode): number
{
    const key = node as object;
    let uid = nodeUids.get(key);

    if (uid === undefined)
    {
        uid = nextUid;
        nextUid += 1;
        nodeUids.set(key, uid);
    }

    return uid;
}

export function takeSnapshot(win: PageGlobals = globalThis as PageGlobals): SnapshotResult
{
    let count = 0;

    function walk(node: PixiNode, path: Array<number>, depth: number, useLabel: boolean): TreeNodeData
    {
        count += 1;

        const uid = uidOf(node);

        if (count > MAX_NODES || depth > MAX_DEPTH)
        {
            return {
                id       : path.join('.'),
                uid,
                label    : '',
                typeName : 'Object',
                visible  : true,
                children : [],
            };
        }

        const kids = childrenOf(node);

        return {
            id       : path.join('.') || '0',
            uid,
            label    : customLabelOf(node, useLabel, win),
            typeName : typeNameOf(node, win),
            visible  : node.visible !== false,
            children : kids.map((child, i) =>
                walk(child, [...path, i], depth + 1, useLabel),
            ),
        };
    }

    const found = findRoot(win);

    if (!found)
    {
        const hints: Array<string> = [];

        if (win.PIXI)
        {
            hints.push('PIXI global present');
        }

        if (win.__PIXI_APP__)
        {
            hints.push('__PIXI_APP__');
        }

        if (win.__PIXI_STAGE__)
        {
            hints.push('__PIXI_STAGE__');
        }

        if (win.__PIXI_RENDERER__)
        {
            hints.push('__PIXI_RENDERER__');
        }

        return {
            ok     : false,
            reason : hints.length
                ? `Pixi detected but no stage/root found (${
                    hints.join(', ')
                }). Expose __PIXI_APP__ or __PIXI_STAGE__.`
                : 'No PixiJS app found. Set globalThis.__PIXI_APP__ = app;',
        };
    }

    const useLabel = isPixi8(found.root, win);

    return {
        ok     : true,
        source : found.source,
        tree   : walk(found.root, [0], 0, useLabel),
    };
}
