import { childrenOf, findRoot } from '../root';
import { collectTextureNames } from './cache';
import { nodeTexture } from './is-texture';
import { basename, localTextureName } from './names';

import type { PageGlobals, PixiNode, PixiTexture } from '../pixi-node';

function walkSceneNodes(win: PageGlobals, visit: (node: PixiNode) => boolean | void)
{
    const found = findRoot(win);

    if (!found)
    {
        return;
    }

    const stack: Array<PixiNode> = [found.root];

    while (stack.length > 0)
    {
        const node = stack.pop();

        if (!node)
        {
            continue;
        }

        if (visit(node) === true)
        {
            return;
        }

        const kids = childrenOf(node);

        for (let i = kids.length - 1; i >= 0; i--)
        {
            stack.push(kids[i]);
        }
    }
}

export function collectSceneTextures(
    win: PageGlobals,
    displayNameOf: (texture: PixiTexture) => string,
    out: Map<string, PixiTexture>,
)
{
    const seen = new Set<PixiTexture>();

    walkSceneNodes(win, (node) =>
    {
        const texture = nodeTexture(node);

        if (texture && !seen.has(texture))
        {
            seen.add(texture);
            collectTextureNames(texture, displayNameOf(texture), out);
        }
    });
}

export function findTextureInScene(
    name: string,
    win: PageGlobals,
    displayNameOf: (texture: PixiTexture) => string,
): PixiTexture | undefined
{
    let basenameHit: PixiTexture | undefined;
    let exact: PixiTexture | undefined;
    const wantedBase = basename(name);

    walkSceneNodes(win, (node) =>
    {
        const texture = nodeTexture(node);

        if (!texture)
        {
            return false;
        }

        const display = displayNameOf(texture);

        if (display === name)
        {
            exact = texture;

            return true;
        }

        if (
            !basenameHit
            && display !== ''
            && basename(display) === wantedBase
        )
        {
            basenameHit = texture;
        }
        else if (!basenameHit)
        {
            const local = localTextureName(texture);

            if (local !== '' && (local === name || basename(local) === wantedBase))
            {
                basenameHit = texture;
            }
        }

        return false;
    });

    return exact ?? basenameHit;
}
