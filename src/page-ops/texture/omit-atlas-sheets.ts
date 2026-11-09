import type { PixiTexture } from '../pixi-node';

function textureSourceRef(texture: PixiTexture): object | undefined
{
    if (texture.source && typeof texture.source === 'object')
    {
        return texture.source;
    }

    if (texture.baseTexture && typeof texture.baseTexture === 'object')
    {
        return texture.baseTexture;
    }

    return undefined;
}

function positiveSize(width: number | undefined, height: number | undefined): { width: number; height: number } | undefined
{
    if (
        typeof width !== 'number'
        || typeof height !== 'number'
        || !Number.isFinite(width)
        || !Number.isFinite(height)
        || width <= 0
        || height <= 0
    )
    {
        return undefined;
    }

    return { width, height };
}

function sourceSize(texture: PixiTexture): { width: number; height: number } | undefined
{
    return positiveSize(texture.source?.width, texture.source?.height)
        ?? positiveSize(texture.baseTexture?.width, texture.baseTexture?.height);
}

function approxEqual(left: number, right: number): boolean
{
    return Math.abs(left - right) < 0.5;
}

function isFullSourceFrame(texture: PixiTexture): boolean
{
    const frame = texture.frame;
    const size = sourceSize(texture);

    if (!frame || !size)
    {
        return false;
    }

    if (
        !Number.isFinite(frame.x)
        || !Number.isFinite(frame.y)
        || !Number.isFinite(frame.width)
        || !Number.isFinite(frame.height)
        || frame.width <= 0
        || frame.height <= 0
    )
    {
        return false;
    }

    return approxEqual(frame.x, 0)
        && approxEqual(frame.y, 0)
        && approxEqual(frame.width, size.width)
        && approxEqual(frame.height, size.height);
}

export function atlasSheetTexturesToOmit(textures: Iterable<PixiTexture>): Set<PixiTexture>
{
    const bySource = new Map<object, Array<PixiTexture>>();
    const seen = new Set<PixiTexture>();

    for (const texture of textures)
    {
        if (seen.has(texture))
        {
            continue;
        }

        seen.add(texture);

        const source = textureSourceRef(texture);

        if (!source)
        {
            continue;
        }

        const group = bySource.get(source);

        if (group)
        {
            group.push(texture);
        }
        else
        {
            bySource.set(source, [texture]);
        }
    }

    const omit = new Set<PixiTexture>();

    for (const group of bySource.values())
    {
        if (group.length < 2)
        {
            continue;
        }

        let hasSubFrame = false;

        for (const texture of group)
        {
            if (!isFullSourceFrame(texture))
            {
                hasSubFrame = true;

                break;
            }
        }

        if (!hasSubFrame)
        {
            continue;
        }

        for (const texture of group)
        {
            if (isFullSourceFrame(texture))
            {
                omit.add(texture);
            }
        }
    }

    return omit;
}
