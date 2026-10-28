import { KNOWN_NODE_TYPE_NAMES, matchKnownTypeName, NODE_TYPE_INSTANCEOF_ORDER } from '../node-type-config';
import { ctorName, type PageGlobals, type PixiNode } from './pixi-node';

const KNOWN = new Set(KNOWN_NODE_TYPE_NAMES);

function normalizeTypeName(name: string): string
{
    return matchKnownTypeName(name, KNOWN);
}

function typeNameFromPrototype(node: PixiNode): string
{
    let proto = Object.getPrototypeOf(node) as object | null;

    while (proto && proto !== Object.prototype)
    {
        const raw = (proto as { constructor?: { name?: string } }).constructor
            ?.name;
        const name = normalizeTypeName(raw ?? '');

        if (name)
        {
            return name;
        }

        proto = Object.getPrototypeOf(proto) as object | null;
    }

    return '';
}

function typeNameFromPixiGlobal(node: PixiNode, win: PageGlobals): string
{
    const P = win.PIXI;

    if (!P)
    {
        return '';
    }

    for (let i = 0; i < NODE_TYPE_INSTANCEOF_ORDER.length; i++)
    {
        const name = NODE_TYPE_INSTANCEOF_ORDER[i];
        const Ctor = P[name];

        if (typeof Ctor === 'function')
        {
            try
            {
                if (node instanceof (Ctor as new (...args: Array<never>) => unknown))
                {
                    return name;
                }
            }
            catch
            {
                void 0;
            }
        }
    }

    return '';
}

export function typeNameOf(node: PixiNode | null | undefined, win: PageGlobals = globalThis as PageGlobals): string
{
    if (!node)
    {
        return 'Object';
    }

    if (node._view3d && node._view3d.root === node)
    {
        return 'Scene3D';
    }

    return (
        typeNameFromPrototype(node)
    || typeNameFromPixiGlobal(node, win)
    || normalizeTypeName(ctorName(node))
    || ctorName(node)
    || 'Object'
    );
}

export function isPixi8(root: PixiNode | null | undefined, win: PageGlobals = globalThis as PageGlobals): boolean
{
    const ver = win.PIXI?.VERSION;

    if (typeof ver === 'string')
    {
        const major = parseInt(ver, 10);

        if (!Number.isNaN(major))
        {
            return major >= 8;
        }
    }

    if (root && typeof root.getLocalBounds === 'function')
    {
        try
        {
            const bounds = root.getLocalBounds();

            if (bounds && typeof bounds === 'object' && 'containsPoint' in bounds)
            {
                return true;
            }
        }
        catch
        {
            void 0;
        }
    }

    return !!(root && 'label' in root);
}

export function customLabelOf(
    node: PixiNode | null | undefined,
    useLabel: boolean,
    win: PageGlobals = globalThis as PageGlobals,
): string
{
    if (!node)
    {
        return '';
    }

    const typeName = typeNameOf(node, win);
    let raw = '';

    if (useLabel)
    {
        if ('label' in node && node.label)
        {
            raw = String(node.label);
        }
    }
    else if ('name' in node && node.name)
    {
        raw = String(node.name);
    }

    if (raw)
    {
        return raw;
    }

    const ctor = ctorName(node);

    if (
        ctor
    && ctor !== typeName
    && !normalizeTypeName(ctor)
    && !KNOWN.has(ctor)
    )
    {
        return String(ctor);
    }

    return '';
}
