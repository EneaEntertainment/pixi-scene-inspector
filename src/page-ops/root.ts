import type { PageGlobals, PixiNode } from './pixi-node';

type RootFound = {
    root: PixiNode;
    source: string;
};

export function findRoot(win: PageGlobals = globalThis as PageGlobals): RootFound | null
{
    if (win.__PIXI_STAGE__)
    {
        return { root: win.__PIXI_STAGE__, source: '__PIXI_STAGE__' };
    }

    if (win.__PIXI_APP__?.stage)
    {
        return { root: win.__PIXI_APP__.stage, source: '__PIXI_APP__' };
    }

    const renderer = win.__PIXI_RENDERER__ || win.__PIXI_APP__?.renderer;

    if (renderer?.lastObjectRendered)
    {
        return {
            root   : renderer.lastObjectRendered,
            source : 'renderer.lastObjectRendered',
        };
    }

    if (renderer?._lastObjectRendered)
    {
        return {
            root   : renderer._lastObjectRendered,
            source : 'renderer._lastObjectRendered',
        };
    }

    return null;
}

function getRoot(win: PageGlobals = globalThis as PageGlobals): PixiNode | null
{
    return findRoot(win)?.root ?? null;
}

function listedChildren(node: PixiNode): Array<PixiNode>
{
    if (Array.isArray(node.children))
    {
        return node.children;
    }

    if (
        node.children
    && typeof node.children === 'object'
    && Array.isArray(node.children.list)
    )
    {
        return node.children.list;
    }

    if (Array.isArray(node.list))
    {
        return node.list;
    }

    return [];
}

function bitmapPageMeshes(node: PixiNode): Set<PixiNode> | null
{
    const pages = node._activePagesMeshData;

    if (!Array.isArray(pages) || pages.length === 0)
    {
        return null;
    }

    const meshes = new Set<PixiNode>();

    for (const page of pages)
    {
        const mesh = page?.mesh;

        if (mesh)
        {
            meshes.add(mesh);
        }
    }

    return meshes.size > 0 ? meshes : null;
}

export function bitmapPageMeshInsertOffset(parent: PixiNode, visibleIndex: number, moving: PixiNode): number
{
    const meshes = bitmapPageMeshes(parent);

    if (!meshes)
    {
        return 0;
    }

    let seenVisible = 0;
    let hiddenBefore = 0;

    for (const child of listedChildren(parent))
    {
        if (child === moving)
        {
            continue;
        }

        if (meshes.has(child))
        {
            hiddenBefore += 1;
            continue;
        }

        if (seenVisible === visibleIndex)
        {
            return hiddenBefore;
        }

        seenVisible += 1;
    }

    return hiddenBefore;
}

export function childrenOf(node: PixiNode | null | undefined): Array<PixiNode>
{
    if (!node)
    {
        return [];
    }

    const pageMeshes = bitmapPageMeshes(node);
    let kids = listedChildren(node);

    if (pageMeshes)
    {
        kids = kids.filter((child) => !pageMeshes.has(child));
    }

    const root3d = node.root;

    if (
        root3d
    && root3d !== node
    && Array.isArray(root3d.children)
    && kids.indexOf(root3d) < 0
    )
    {
        return [root3d].concat(kids);
    }

    return kids;
}

export function resolveByPath(pathId: string, win: PageGlobals = globalThis as PageGlobals): PixiNode | null
{
    const path = pathId.split('.').map((n) => Number(n));
    let node = getRoot(win);

    if (!node)
    {
        return null;
    }

    for (let i = 1; i < path.length; i++)
    {
        const kids = childrenOf(node);

        node = kids[path[i]];

        if (!node)
        {
            return null;
        }
    }

    return node;
}

export function pathOf(target: PixiNode, win: PageGlobals = globalThis as PageGlobals): string | null
{
    const root = getRoot(win);

    if (!root || !target)
    {
        return null;
    }

    if (root === target)
    {
        return '0';
    }

    const queue: Array<[PixiNode, Array<string>]> = [[root, ['0']]];

    while (queue.length)
    {
        const item = queue.shift();

        if (!item)
        {
            break;
        }

        const node = item[0];
        const path = item[1];
        const kids = childrenOf(node);

        for (let i = 0; i < kids.length; i++)
        {
            const child = kids[i];
            const childPath = path.concat([String(i)]);

            if (child === target)
            {
                return childPath.join('.');
            }

            queue.push([child, childPath]);
        }
    }

    return null;
}
