import type { PageGlobals, PixiTexture } from '../pixi-node';

type TexturePreviewSource = {
    image: CanvasImageSource;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
};

const extractedPreviewCache = new WeakMap<object, HTMLCanvasElement | null>();

function isCanvasImageSource(value: unknown): value is CanvasImageSource
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    if (value instanceof HTMLImageElement)
    {
        return value.complete && value.naturalWidth > 0;
    }

    if (value instanceof HTMLCanvasElement)
    {
        return value.width > 0 && value.height > 0;
    }

    if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap)
    {
        return value.width > 0 && value.height > 0;
    }

    if (value instanceof HTMLVideoElement)
    {
        return value.videoWidth > 0 && value.videoHeight > 0;
    }

    if (typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas)
    {
        return value.width > 0 && value.height > 0;
    }

    return false;
}

function textureResourceCandidate(texture: PixiTexture): unknown
{
    if (texture.source && 'resource' in texture.source)
    {
        return texture.source.resource;
    }

    const resource = texture.baseTexture?.resource;

    if (!resource)
    {
        return undefined;
    }

    if (isCanvasImageSource(resource))
    {
        return resource;
    }

    if (resource.source !== undefined)
    {
        return resource.source;
    }

    return undefined;
}

function textureResolution(texture: PixiTexture): number
{
    const candidates: Array<number | undefined> = [
        texture.source?.resolution,
        texture.source?._resolution,
        texture.baseTexture?.resolution,
    ];

    for (const value of candidates)
    {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0)
        {
            return value;
        }
    }

    return 1;
}

function imagePixelSize(image: CanvasImageSource): { width: number; height: number }
{
    if (image instanceof HTMLImageElement)
    {
        return { width: image.naturalWidth, height: image.naturalHeight };
    }

    if (image instanceof HTMLVideoElement)
    {
        return { width: image.videoWidth, height: image.videoHeight };
    }

    if ('width' in image && 'height' in image)
    {
        return {
            width  : Number(image.width) || 0,
            height : Number(image.height) || 0,
        };
    }

    return { width: 0, height: 0 };
}

function resolvePixiRenderer(win: PageGlobals = globalThis as PageGlobals)
{
    return win.__PIXI_RENDERER__ || win.__PIXI_APP__?.renderer;
}

function cloneToHtmlCanvas(source: CanvasImageSource): HTMLCanvasElement | null
{
    const { width, height } = imagePixelSize(source);

    if (width <= 0 || height <= 0)
    {
        return null;
    }

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx)
    {
        return null;
    }

    try
    {
        ctx.drawImage(source, 0, 0);

        return canvas;
    }
    catch
    {
        return null;
    }
}

function extractTextureCanvas(texture: PixiTexture, win: PageGlobals = globalThis as PageGlobals): HTMLCanvasElement | null
{
    if (typeof texture !== 'object' || texture === null)
    {
        return null;
    }

    if (extractedPreviewCache.has(texture))
    {
        return extractedPreviewCache.get(texture) ?? null;
    }

    const extract = resolvePixiRenderer(win)?.extract;
    const extractCanvas = extract?.canvas;

    if (typeof extractCanvas !== 'function')
    {
        extractedPreviewCache.set(texture, null);

        return null;
    }

    let extracted: unknown;

    try
    {
        extracted = extractCanvas.call(extract, texture);
    }
    catch
    {
        extractedPreviewCache.set(texture, null);

        return null;
    }

    let canvas: HTMLCanvasElement | null = null;

    if (extracted instanceof HTMLCanvasElement && extracted.width > 0 && extracted.height > 0)
    {
        canvas = extracted;
    }
    else if (isCanvasImageSource(extracted))
    {
        canvas = cloneToHtmlCanvas(extracted);
    }

    extractedPreviewCache.set(texture, canvas);

    return canvas;
}

function texturePreviewSource(
    texture: PixiTexture,
    win: PageGlobals = globalThis as PageGlobals,
): TexturePreviewSource | null
{
    const image = textureResourceCandidate(texture);

    if (isCanvasImageSource(image))
    {
        const frame = texture.frame;

        if (
            frame
            && Number.isFinite(frame.x)
            && Number.isFinite(frame.y)
            && Number.isFinite(frame.width)
            && Number.isFinite(frame.height)
            && frame.width > 0
            && frame.height > 0
        )
        {
            const resolution = textureResolution(texture);

            return {
                image,
                sx : frame.x * resolution,
                sy : frame.y * resolution,
                sw : frame.width * resolution,
                sh : frame.height * resolution,
            };
        }

        const { width, height } = imagePixelSize(image);

        if (width > 0 && height > 0)
        {
            return {
                image,
                sx : 0,
                sy : 0,
                sw : width,
                sh : height,
            };
        }
    }

    const extracted = extractTextureCanvas(texture, win);

    if (!extracted)
    {
        return null;
    }

    return {
        image : extracted,
        sx    : 0,
        sy    : 0,
        sw    : extracted.width,
        sh    : extracted.height,
    };
}

const GROUP_D8_UX = [1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1, -1, 0, 1];
const GROUP_D8_UY = [0, 1, 1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1, -1];
const GROUP_D8_VX = [0, -1, -1, -1, 0, 1, 1, 1, 0, 1, 1, 1, 0, -1, -1, -1];
const GROUP_D8_VY = [1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, 1, 1, 1, 0, -1];

function textureRotate(texture: PixiTexture): number
{
    const value = texture.rotate;

    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0)
    {
        return 0;
    }

    return value & 15;
}

function isVerticalTextureRotate(rotate: number): boolean
{
    return (rotate & 3) === 2;
}

function inverseTextureRotate(rotate: number): number
{
    if (rotate & 8)
    {
        return rotate & 15;
    }

    return -rotate & 7;
}

function applyInverseTextureRotation(ctx: CanvasRenderingContext2D, rotate: number, srcWidth: number, srcHeight: number)
{
    const inv = inverseTextureRotate(rotate);
    const a = GROUP_D8_UX[inv] ?? 1;
    const b = GROUP_D8_UY[inv] ?? 0;
    const c = GROUP_D8_VX[inv] ?? 0;
    const d = GROUP_D8_VY[inv] ?? 1;
    const tx = -Math.min(0, a * srcWidth, c * srcHeight, (a * srcWidth) + (c * srcHeight));
    const ty = -Math.min(0, b * srcWidth, d * srcHeight, (b * srcWidth) + (d * srcHeight));

    ctx.transform(a, b, c, d, tx, ty);
}

export function paintTexturePreview(
    canvas: HTMLCanvasElement,
    texture: PixiTexture,
    size: number,
    win: PageGlobals = globalThis as PageGlobals,
): boolean
{
    const preview = texturePreviewSource(texture, win);
    const ctx = canvas.getContext('2d');

    canvas.width = size;
    canvas.height = size;

    if (!ctx)
    {
        return false;
    }

    ctx.fillStyle = '#1a1a1a';

    ctx.clearRect(0, 0, size, size);
    ctx.fillRect(0, 0, size, size);

    const cell = Math.max(4, Math.floor(size / 8));

    for (let y = 0; y < size; y += cell)
    {
        for (let x = 0; x < size; x += cell)
        {
            if (((x / cell) + (y / cell)) % 2 === 0)
            {
                ctx.fillStyle = '#2a2a2a';

                ctx.fillRect(x, y, cell, cell);
            }
        }
    }

    if (!preview)
    {
        return false;
    }

    const rotate = textureRotate(texture);
    const contentW = isVerticalTextureRotate(rotate) ? preview.sh : preview.sw;
    const contentH = isVerticalTextureRotate(rotate) ? preview.sw : preview.sh;
    const scale = Math.min(size / contentW, size / contentH);
    const drawW = Math.max(1, contentW * scale);
    const drawH = Math.max(1, contentH * scale);
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;

    try
    {
        ctx.imageSmoothingEnabled = scale < 1;

        if (rotate === 0)
        {
            ctx.drawImage(
                preview.image,
                preview.sx,
                preview.sy,
                preview.sw,
                preview.sh,
                dx,
                dy,
                drawW,
                drawH,
            );
        }
        else
        {
            ctx.save();
            ctx.translate(dx, dy);
            ctx.scale(drawW / contentW, drawH / contentH);

            applyInverseTextureRotation(ctx, rotate, preview.sw, preview.sh);

            ctx.drawImage(
                preview.image,
                preview.sx,
                preview.sy,
                preview.sw,
                preview.sh,
                0,
                0,
                preview.sw,
                preview.sh,
            );

            ctx.restore();
        }

        return true;
    }
    catch
    {
        return false;
    }
}
