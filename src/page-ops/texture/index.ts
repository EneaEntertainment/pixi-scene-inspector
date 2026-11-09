import {
    cacheNameForTexture,
    collectResolvedCaches,
    findInResolvedCaches,
    resolveTextureCaches,
} from './cache';
import { nodeHasTexture, nodeTexture } from './is-texture';
import { localTextureName } from './names';
import { atlasSheetTexturesToOmit } from './omit-atlas-sheets';
import { collectSceneTextures, findTextureInScene } from './scene';

import type { PageGlobals, PixiNode, PixiTexture } from '../pixi-node';
import type { CachedTextureEntry } from './cache';

export type { CachedTextureEntry } from './cache';
export { hasExposedTextureCache } from './cache';
export { nodeHasTexture } from './is-texture';
export { paintTexturePreview } from './preview';

function textureNameOf(texture: PixiTexture | null | undefined, win: PageGlobals = globalThis as PageGlobals): string
{
    if (!texture)
    {
        return '';
    }

    const caches = resolveTextureCaches(win);

    return cacheNameForTexture(texture, caches) || localTextureName(texture);
}

export function nodeTextureName(node: PixiNode | null | undefined, win: PageGlobals = globalThis as PageGlobals): string
{
    return textureNameOf(nodeTexture(node), win);
}

export function listCachedTextures(win: PageGlobals = globalThis as PageGlobals): Array<CachedTextureEntry>
{
    const byName = new Map<string, PixiTexture>();
    const caches = resolveTextureCaches(win);
    const displayNameOf = (texture: PixiTexture) => textureNameOf(texture, win);

    collectResolvedCaches(caches, displayNameOf, byName);
    collectSceneTextures(win, displayNameOf, byName);

    const omitSheets = atlasSheetTexturesToOmit(byName.values());
    const entries: Array<CachedTextureEntry> = [];

    for (const [name, texture] of byName.entries())
    {
        if (omitSheets.has(texture))
        {
            continue;
        }

        entries.push({ name, texture });
    }

    entries.sort((left, right) => left.name.localeCompare(right.name, undefined, {
        sensitivity : 'base',
        numeric     : true,
    }));

    return entries;
}

function resolveTextureByName(name: string, win: PageGlobals = globalThis as PageGlobals): PixiTexture | undefined
{
    const key = name.trim();

    if (key === '')
    {
        return undefined;
    }

    const caches = resolveTextureCaches(win);
    const fromCache = findInResolvedCaches(key, caches);

    if (fromCache)
    {
        return fromCache;
    }

    return findTextureInScene(key, win, (texture) => textureNameOf(texture, win));
}

export function setNodeTextureByName(node: PixiNode, name: string, win: PageGlobals = globalThis as PageGlobals): boolean
{
    if (!nodeHasTexture(node))
    {
        return false;
    }

    const next = resolveTextureByName(name, win);

    if (!next)
    {
        return false;
    }

    if (node.texture === next)
    {
        return true;
    }

    node.texture = next;

    return true;
}
