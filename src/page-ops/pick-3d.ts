import { childrenOf } from './root';

import type { View3DNode } from './node-3d';
import type { PixiNode } from './pixi-node';

type IPoint = {
    x: number;
    y: number;
};

type RaycastHit = {
    target?: PixiNode | null;
};

type ModeRestore = {
    node: PixiNode;
    mode: string | undefined;
};

type WorldVisibleRestore = {
    node: PixiNode;
    value: number;
};

const MAX_3D_HITS = 32;

function readEventMode(node: PixiNode): string | undefined
{
    return typeof node.eventMode === 'string' ? node.eventMode : undefined;
}

function setEventMode(node: PixiNode, mode: string | undefined)
{
    node.eventMode = mode ?? 'passive';
}

function hasPickVolume(node: PixiNode): boolean
{
    const candidate = node as PixiNode & {
        _hasPickVolume?: () => boolean;
        _getDefaultHitVolume?: () => unknown;
        _hitVolumeResolved?: unknown;
        hitVolume?: unknown;
    };

    if (typeof candidate._hasPickVolume === 'function')
    {
        try
        {
            return candidate._hasPickVolume() === true;
        }
        catch
        {
            return false;
        }
    }

    if (candidate._hitVolumeResolved !== undefined && candidate._hitVolumeResolved !== null)
    {
        return true;
    }

    if (candidate.hitVolume !== undefined && candidate.hitVolume !== null)
    {
        return true;
    }

    if (typeof candidate._getDefaultHitVolume === 'function')
    {
        try
        {
            const volume = candidate._getDefaultHitVolume();

            return volume !== null && volume !== undefined;
        }
        catch
        {
            return false;
        }
    }

    return false;
}

function collectPickable3D(node: PixiNode, includeHidden: boolean, out: Array<PixiNode>)
{
    if (!includeHidden && node.visible === false)
    {
        return;
    }

    if (hasPickVolume(node))
    {
        out.push(node);
    }

    for (const child of childrenOf(node))
    {
        collectPickable3D(child, includeHidden, out);
    }
}

function enableInspectorPicking(nodes: Array<PixiNode>): Array<ModeRestore>
{
    const restored: Array<ModeRestore> = [];

    for (const node of nodes)
    {
        const mode = readEventMode(node);

        if (mode === 'static' || mode === 'dynamic')
        {
            continue;
        }

        restored.push({ node, mode });
        setEventMode(node, 'static');
    }

    return restored;
}

function restoreEventModes(restored: Array<ModeRestore>)
{
    for (let i = restored.length - 1; i >= 0; i -= 1)
    {
        const entry = restored[i];

        if (entry)
        {
            setEventMode(entry.node, entry.mode);
        }
    }
}

function readWorldVisible(node: PixiNode): number | null
{
    const value = (node as PixiNode & { _worldVisible?: unknown; })._worldVisible;

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function revealHiddenForPick(nodes: Array<PixiNode>): Array<WorldVisibleRestore>
{
    const restored: Array<WorldVisibleRestore> = [];

    for (const node of nodes)
    {
        const value = readWorldVisible(node);

        if (value === null || value !== 0)
        {
            continue;
        }

        restored.push({ node, value });
        (node as PixiNode & { _worldVisible: number; })._worldVisible = 1;
    }

    return restored;
}

function restoreWorldVisible(restored: Array<WorldVisibleRestore>)
{
    for (let i = restored.length - 1; i >= 0; i -= 1)
    {
        const entry = restored[i];

        if (entry)
        {
            (entry.node as PixiNode & { _worldVisible: number; })._worldVisible = entry.value;
        }
    }
}

export function pick3DNodesAt(view: View3DNode, point: IPoint, includeHidden: boolean): Array<PixiNode>
{
    const raycast = view.raycast;
    const root = view.root;

    if (typeof raycast !== 'function' || !root)
    {
        return [];
    }

    const pickable: Array<PixiNode> = [];

    collectPickable3D(root, includeHidden, pickable);

    if (pickable.length === 0)
    {
        return [];
    }

    const enabled = enableInspectorPicking(pickable);
    const revealed = includeHidden ? revealHiddenForPick(pickable) : [];
    const suppressed: Array<ModeRestore> = [];
    const hits: Array<PixiNode> = [];

    try
    {
        while (hits.length < MAX_3D_HITS)
        {
            let hit: RaycastHit | null = null;

            try
            {
                hit = raycast.call(view, point);
            }
            catch
            {
                break;
            }

            const target = hit?.target;

            if (!target)
            {
                break;
            }

            hits.push(target);
            suppressed.push({ node: target, mode: readEventMode(target) });
            setEventMode(target, 'none');
        }
    }
    finally
    {
        restoreEventModes(suppressed);
        restoreWorldVisible(revealed);
        restoreEventModes(enabled);
    }

    return hits;
}
