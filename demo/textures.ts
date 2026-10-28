import { Graphics, Texture } from 'pixi.js';

import type { Application, CanvasSource } from 'pixi.js';

export type DemoTextures = {
    solid: Texture;
    checker: Texture;
    nineSlice: Texture;
    animFrames: Array<Texture>;
    gifSourceFrames: Array<{ texture: Texture<CanvasSource>; start: number; end: number }>;
    mesh: Texture;
};

function canvasFill(color: string, width: number, height: number): HTMLCanvasElement
{
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx)
    {
        throw new Error('2d context unavailable');
    }

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    return canvas;
}

function canvasTexture(color: string, width = 32, height = 32): Texture<CanvasSource>
{
    return Texture.from(canvasFill(color, width, height)) as Texture<CanvasSource>;
}

export function createDemoTextures(app: Application): DemoTextures
{
    const solidGfx = new Graphics().rect(0, 0, 48, 48).fill(0x4ade80);
    const solid = app.renderer.generateTexture(solidGfx);

    solidGfx.destroy();

    const checkerGfx = new Graphics();

    for (let y = 0; y < 4; y++)
    {
        for (let x = 0; x < 4; x++)
        {
            const even = ((x + y) % 2) === 0;

            checkerGfx.rect(x * 16, y * 16, 16, 16).fill(even ? 0xfbbf24 : 0x1e3a5f);
        }
    }

    const checker = app.renderer.generateTexture(checkerGfx);

    checkerGfx.destroy();

    const nineGfx = new Graphics()
        .rect(0, 0, 64, 64)
        .fill(0x334155)
        .rect(0, 0, 64, 12)
        .fill(0xf97316)
        .rect(0, 52, 64, 12)
        .fill(0xf97316)
        .rect(0, 0, 12, 64)
        .fill(0xea580c)
        .rect(52, 0, 12, 64)
        .fill(0xea580c)
        .rect(12, 12, 40, 40)
        .fill(0xfef3c7);

    const nineSlice = app.renderer.generateTexture(nineGfx);

    nineGfx.destroy();

    const animFrames: Array<Texture> = [];
    const colors = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6];

    for (const color of colors)
    {
        const frameGfx = new Graphics().circle(16, 16, 14).fill(color);
        const frame = app.renderer.generateTexture(frameGfx);

        frameGfx.destroy();
        animFrames.push(frame);
    }

    const meshGfx = new Graphics()
        .rect(0, 0, 64, 64)
        .fill(0xc026d3)
        .poly([0, 0, 64, 0, 32, 64])
        .fill({ color: 0xf0abfc, alpha: 0.55 });

    const mesh = app.renderer.generateTexture(meshGfx);

    meshGfx.destroy();

    const gifSourceFrames = [
        { texture: canvasTexture('#ef4444', 40, 40), start: 0, end: 180 },
        { texture: canvasTexture('#22c55e', 40, 40), start: 180, end: 360 },
        { texture: canvasTexture('#3b82f6', 40, 40), start: 360, end: 540 },
    ];

    return { solid, checker, nineSlice, animFrames, gifSourceFrames, mesh };
}
