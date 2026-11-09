import type { CachedTextureEntry } from '../../../page-ops/texture';

export type PathTreeNode = {
    folders: Map<string, PathTreeNode>;
    files: Array<CachedTextureEntry>;
};

function emptyNode(): PathTreeNode
{
    return {
        folders : new Map(),
        files   : [],
    };
}

export function pathSegments(name: string): Array<string>
{
    return name.replace(/\\/g, '/').split('/').filter((segment) => segment !== '');
}

export function buildPathTree(entries: Array<CachedTextureEntry>): PathTreeNode
{
    const root = emptyNode();

    for (const entry of entries)
    {
        const segments = pathSegments(entry.name);

        if (segments.length === 0)
        {
            root.files.push(entry);

            continue;
        }

        let node = root;

        for (let index = 0; index < segments.length - 1; index++)
        {
            const segment = segments[index] ?? '';
            let child = node.folders.get(segment);

            if (!child)
            {
                child = emptyNode();

                node.folders.set(segment, child);
            }

            node = child;
        }

        node.files.push(entry);
    }

    return root;
}

export function nodeAtPath(root: PathTreeNode, path: Array<string>): PathTreeNode | undefined
{
    let node = root;

    for (const segment of path)
    {
        const child = node.folders.get(segment);

        if (!child)
        {
            return undefined;
        }

        node = child;
    }

    return node;
}

export function folderNames(node: PathTreeNode): Array<string>
{
    return Array.from(node.folders.keys()).sort((left, right) => left.localeCompare(right, undefined, {
        sensitivity : 'base',
        numeric     : true,
    }));
}

export function pathToEntry(name: string): Array<string>
{
    const segments = pathSegments(name);

    if (segments.length <= 1)
    {
        return [];
    }

    return segments.slice(0, -1);
}

export function createEmptyPathTree(): PathTreeNode
{
    return emptyNode();
}
