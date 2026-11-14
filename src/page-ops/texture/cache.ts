import { isPixiTexture } from './is-texture';
import { basename, localTextureName, textureLabelCandidates } from './names';

import type { PageGlobals, PixiTexture } from '../pixi-node';

export type CachedTextureEntry = {
    name: string;
    texture: PixiTexture;
};

type AssetCache = {
    has?: (key: string) => boolean;
    get?: (key: string) => unknown;
    _cache?: Map<unknown, unknown>;
};

export type ResolvedTextureCaches = {
    record?: Record<string, unknown>;
    asset?: AssetCache;
};

function isAssetCache(value: unknown): value is AssetCache
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const cache = value as AssetCache;

    if (cache._cache && typeof cache._cache.entries === 'function')
    {
        return true;
    }

    return typeof cache.has === 'function' && typeof cache.get === 'function';
}

function isPlainRecordCache(value: unknown): value is Record<string, unknown>
{
    return !!value && typeof value === 'object' && !Array.isArray(value) && !isAssetCache(value);
}

export function hasExposedTextureCache(win: PageGlobals = globalThis as PageGlobals): boolean
{
    const exposed = win.__PIXI_CACHE__;

    return isAssetCache(exposed) || isPlainRecordCache(exposed);
}

function v7TextureCache(win: PageGlobals): Record<string, unknown> | undefined
{
    const utils = win.PIXI?.utils;

    if (!utils || typeof utils !== 'object')
    {
        return undefined;
    }

    const textureCache = (utils as { TextureCache?: Record<string, unknown> }).TextureCache;

    return textureCache && typeof textureCache === 'object' ? textureCache : undefined;
}

function v8AssetCache(win: PageGlobals): AssetCache | undefined
{
    const candidates: Array<unknown> = [
        (win.PIXI as { Cache?: unknown } | undefined)?.Cache,
        (win.PIXI as { Assets?: { cache?: unknown } } | undefined)?.Assets?.cache,
        win.Assets?.cache,
        win.Cache,
    ];

    for (const candidate of candidates)
    {
        if (isAssetCache(candidate))
        {
            return candidate;
        }
    }

    return undefined;
}

export function resolveTextureCaches(win: PageGlobals): ResolvedTextureCaches
{
    const exposed = win.__PIXI_CACHE__;

    if (isAssetCache(exposed))
    {
        return { asset: exposed };
    }

    if (isPlainRecordCache(exposed))
    {
        return { record: exposed };
    }

    return {
        record : v7TextureCache(win),
        asset  : v8AssetCache(win),
    };
}

function isUsefulCacheKey(key: unknown): key is string
{
    if (typeof key !== 'string')
    {
        return false;
    }

    const trimmed = key.trim();

    if (trimmed === '' || trimmed.startsWith('[object '))
    {
        return false;
    }

    return true;
}

function addNamedTexture(out: Map<string, PixiTexture>, name: string | undefined, texture: PixiTexture)
{
    const key = typeof name === 'string' ? name.trim() : '';

    if (key === '' || out.has(key))
    {
        return;
    }

    out.set(key, texture);
}

export function collectTextureNames(texture: PixiTexture, displayName: string, out: Map<string, PixiTexture>)
{
    addNamedTexture(out, displayName, texture);

    for (const id of texture.textureCacheIds ?? [])
    {
        addNamedTexture(out, id, texture);
    }

    for (const id of texture.baseTexture?.textureCacheIds ?? [])
    {
        addNamedTexture(out, id, texture);
    }
}

function collectCacheEntry(
    key: unknown,
    value: unknown,
    displayNameOf: (texture: PixiTexture) => string,
    out: Map<string, PixiTexture>,
)
{
    if (!isPixiTexture(value))
    {
        return;
    }

    if (isUsefulCacheKey(key))
    {
        out.set(key, value);
    }
    else
    {
        collectTextureNames(value, displayNameOf(value), out);
    }
}

function collectRecordCache(
    cache: Record<string, unknown>,
    displayNameOf: (texture: PixiTexture) => string,
    out: Map<string, PixiTexture>,
)
{
    for (const key of Object.keys(cache))
    {
        collectCacheEntry(key, cache[key], displayNameOf, out);
    }
}

function collectMapCache(
    map: Map<unknown, unknown>,
    displayNameOf: (texture: PixiTexture) => string,
    out: Map<string, PixiTexture>,
)
{
    for (const [key, value] of map.entries())
    {
        collectCacheEntry(key, value, displayNameOf, out);
    }
}

export function collectResolvedCaches(
    caches: ResolvedTextureCaches,
    displayNameOf: (texture: PixiTexture) => string,
    out: Map<string, PixiTexture>,
)
{
    if (caches.record)
    {
        collectRecordCache(caches.record, displayNameOf, out);
    }

    const map = caches.asset?._cache;

    if (map && typeof map.entries === 'function')
    {
        collectMapCache(map, displayNameOf, out);
    }
}

export function cacheNameForTexture(texture: PixiTexture, caches: ResolvedTextureCaches): string | undefined
{
    if (caches.record)
    {
        for (const key of Object.keys(caches.record))
        {
            if (caches.record[key] === texture && key !== '')
            {
                return key;
            }
        }
    }

    const map = caches.asset?._cache;

    if (map && typeof map.entries === 'function')
    {
        for (const [key, value] of map.entries())
        {
            if (value === texture && typeof key === 'string' && key !== '')
            {
                return key;
            }
        }
    }

    return undefined;
}

function textureNameOfResolved(texture: PixiTexture, caches: ResolvedTextureCaches): string
{
    return cacheNameForTexture(texture, caches) || localTextureName(texture);
}

function textureMatchesName(texture: PixiTexture, name: string, caches: ResolvedTextureCaches): boolean
{
    const display = textureNameOfResolved(texture, caches);

    if (display === name)
    {
        return true;
    }

    if (display !== '' && basename(display) === basename(name))
    {
        return true;
    }

    for (const labeled of textureLabelCandidates(texture))
    {
        if (labeled === name || basename(labeled) === basename(name))
        {
            return true;
        }
    }

    return false;
}

function findInCacheEntries(
    entries: Iterable<[unknown, unknown]>,
    name: string,
    caches: ResolvedTextureCaches,
    exact: PixiTexture | undefined,
): PixiTexture | undefined
{
    if (exact)
    {
        return exact;
    }

    let basenameHit: PixiTexture | undefined;
    const wantedBase = basename(name);

    for (const [key, value] of entries)
    {
        if (!isPixiTexture(value))
        {
            continue;
        }

        if (
            typeof key === 'string'
            && basename(key) === wantedBase
            && !basenameHit
        )
        {
            basenameHit = value;
        }

        if (textureMatchesName(value, name, caches))
        {
            if (textureNameOfResolved(value, caches) === name)
            {
                return value;
            }

            if (!basenameHit)
            {
                basenameHit = value;
            }
        }
    }

    return basenameHit;
}

function findInRecordCache(
    cache: Record<string, unknown>,
    name: string,
    caches: ResolvedTextureCaches,
): PixiTexture | undefined
{
    const exactValue = cache[name];
    const exact = isPixiTexture(exactValue) ? exactValue : undefined;

    return findInCacheEntries(Object.entries(cache), name, caches, exact);
}

function findInMapCache(map: Map<unknown, unknown>, name: string, caches: ResolvedTextureCaches): PixiTexture | undefined
{
    const exactValue = map.has(name) ? map.get(name) : undefined;
    const exact = isPixiTexture(exactValue) ? exactValue : undefined;

    return findInCacheEntries(map.entries(), name, caches, exact);
}

export function findInResolvedCaches(name: string, caches: ResolvedTextureCaches): PixiTexture | undefined
{
    if (caches.record)
    {
        const fromRecord = findInRecordCache(caches.record, name, caches);

        if (fromRecord)
        {
            return fromRecord;
        }
    }

    const asset = caches.asset;
    const map = asset?._cache;

    if (map && typeof map.entries === 'function')
    {
        const fromMap = findInMapCache(map, name, caches);

        if (fromMap)
        {
            return fromMap;
        }
    }
    else if (asset?.has?.(name))
    {
        const fromCache = asset.get?.(name);

        if (isPixiTexture(fromCache))
        {
            return fromCache;
        }
    }

    return undefined;
}
