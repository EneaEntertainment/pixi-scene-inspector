import type { PixiNode } from './pixi-node';

export type View3DNode = PixiNode & {
    raycast?: (
        position: { x: number; y: number },
        out?: unknown,
    ) => { target?: PixiNode | null } | null;
    root?: PixiNode;
};

export function readMatrix4Elements(node: PixiNode): ArrayLike<number> | null
{
    const matrix = node.worldTransform as { elements?: ArrayLike<number> } | undefined;
    const elements = matrix?.elements;

    if (!elements || elements.length < 16)
    {
        return null;
    }

    return elements;
}

export function isScene3D(node: PixiNode | null | undefined): boolean
{
    return !!node?._view3d && node._view3d.root === node;
}

export function isView3D(node: PixiNode | null | undefined): node is View3DNode
{
    if (!node?.root || node.root === node)
    {
        return false;
    }

    return typeof (node as View3DNode).raycast === 'function';
}

export function isNode3D(node: PixiNode | null | undefined): node is PixiNode
{
    if (!node?._view3d?.worldToScreen)
    {
        return false;
    }

    return readMatrix4Elements(node) !== null;
}
