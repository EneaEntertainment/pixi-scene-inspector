import type { FloatRectSettings } from './settings';

export type FloatRect = FloatRectSettings;
export const FLOAT_CORNER_SIZE = 14;

const FLOAT_MIN_VISIBLE = 40;

type ClampFloatRectOptions = {
    clampWidth: (width: number, viewportW: number) => number;
    viewportW: number;
    viewportH: number;
    minHeight: number;
    minWidth?: number;
    minVisible?: number;
};

export function clampFloatRect(rect: FloatRect, options: ClampFloatRectOptions): FloatRect
{
    const minVisible = options.minVisible ?? FLOAT_MIN_VISIBLE;

    const width = options.minWidth === undefined
        ? options.clampWidth(rect.width, options.viewportW)
        : Math.max(
            options.minWidth,
            options.clampWidth(rect.width, options.viewportW),
        );

    const height = Math.max(
        options.minHeight,
        Math.min(
            rect.height,
            Math.max(options.minHeight, options.viewportH),
        ),
    );

    const left = Math.min(
        Math.max(rect.left, minVisible - width),
        options.viewportW - minVisible,
    );

    const top = Math.min(
        Math.max(rect.top, 0),
        Math.max(0, options.viewportH - minVisible),
    );

    return { left, top, width, height };
}
