import type { PixiTexture } from '../pixi-node';

function firstCacheId(ids: Array<string> | undefined): string | undefined
{
    if (!ids)
    {
        return undefined;
    }

    for (const id of ids)
    {
        if (id !== '')
        {
            return id;
        }
    }

    return undefined;
}

function nonEmptyString(value: string | undefined): string | undefined
{
    if (typeof value !== 'string')
    {
        return undefined;
    }

    const trimmed = value.trim();

    return trimmed === '' ? undefined : trimmed;
}

export function basename(path: string): string
{
    const normalized = path.replace(/\\/g, '/');
    const slash = normalized.lastIndexOf('/');

    return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

export function textureLabelCandidates(texture: PixiTexture): Array<string>
{
    const values = [
        nonEmptyString(texture.label),
        nonEmptyString(texture.source?.label),
        nonEmptyString(texture.source?._sourceOrigin),
        nonEmptyString(texture.baseTexture?.label),
    ];

    const out: Array<string> = [];

    for (const value of values)
    {
        if (value && !out.includes(value))
        {
            out.push(value);
        }
    }

    return out;
}

export function localTextureName(texture: PixiTexture): string
{
    const cached = firstCacheId(texture.textureCacheIds) ?? firstCacheId(texture.baseTexture?.textureCacheIds);

    if (cached)
    {
        return cached;
    }

    const labeled = textureLabelCandidates(texture)[0];

    if (labeled)
    {
        return labeled;
    }

    return nonEmptyString(texture.baseTexture?.resource?.url)
        ?? nonEmptyString(texture.baseTexture?.resource?.src)
        ?? '';
}
