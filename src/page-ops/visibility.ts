import { isHideBlockedTypeName } from '../node-type-config';
import { isScene3D } from './node-3d';
import { ctorName, type PageGlobals, type PixiNode } from './pixi-node';
import { resolveByPath } from './root';

function typeNameBlocked(node: PixiNode): boolean
{
    let proto = Object.getPrototypeOf(node) as object | null;

    while (proto && proto !== Object.prototype)
    {
        const raw = (proto as { constructor?: { name?: string } }).constructor?.name ?? '';

        if (raw && isHideBlockedTypeName(raw))
        {
            return true;
        }

        proto = Object.getPrototypeOf(proto) as object | null;
    }

    const ctor = ctorName(node);

    return Boolean(ctor && isHideBlockedTypeName(ctor));
}

export function isHideBlocked(node: PixiNode): boolean
{
    if (typeNameBlocked(node))
    {
        return true;
    }

    if (isScene3D(node))
    {
        return true;
    }

    const view = node._view3d;

    if (view?.camera)
    {
        let cur: PixiNode | null | undefined = view.camera;

        while (cur)
        {
            if (cur === node)
            {
                return true;
            }

            cur = cur.parent;
        }
    }

    return false;
}

export function canEditVisibleState(visible: boolean | undefined, hideBlocked: boolean): boolean
{
    if (visible !== true)
    {
        return true;
    }

    return !hideBlocked;
}

export function canMapVisibleProp(node: PixiNode): boolean
{
    return canEditVisibleState(node.visible, isHideBlocked(node));
}

export function toggleNodeVisible(pathId: string, win: PageGlobals = globalThis as PageGlobals): boolean
{
    const node = resolveByPath(pathId, win);

    if (!node)
    {
        return false;
    }

    if (!canEditVisibleState(node.visible, isHideBlocked(node)))
    {
        return false;
    }

    node.visible = !node.visible;
    win.$pixi = node;

    return true;
}
