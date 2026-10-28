import {
    colorToString,
    isPlainColorSource,
    isRgbColorArray,
    parseColorString,
    replaceRgbColorArray,
    writeColorValue,
} from './colors';

import type { StyleRecord } from './types';

export function readStrokeColor(style: StyleRecord, pixi8: boolean): string | undefined
{
    const stroke = style.stroke;

    if (pixi8)
    {
        if (stroke === undefined || stroke === null)
        {
            return '';
        }

        const direct = colorToString(stroke);

        if (direct !== undefined)
        {
            return direct;
        }

        if (stroke && typeof stroke === 'object')
        {
            const record = stroke as Record<string, unknown>;

            if (!isPlainColorSource(stroke) && !('color' in record) && !('width' in record))
            {
                return undefined;
            }

            return colorToString(record.color) ?? '';
        }

        return undefined;
    }

    if (stroke === undefined || stroke === null)
    {
        return '';
    }

    return colorToString(stroke) ?? '';
}

export function writeStrokeColor(style: StyleRecord, value: string, pixi8: boolean)
{
    const parsed = parseColorString(value);

    if (!pixi8)
    {
        style.stroke = parsed;

        return;
    }

    const stroke = style.stroke;

    if (isRgbColorArray(stroke))
    {
        style.stroke = replaceRgbColorArray(stroke, parsed);

        return;
    }

    if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
    {
        const record = stroke as Record<string, unknown>;

        style.stroke = {
            ...record,
            color: 'color' in record
                ? writeColorValue(record.color, parsed)
                : parsed,
        };

        return;
    }

    style.stroke = { color: parsed };
}

export function readStrokeWidth(style: StyleRecord, pixi8: boolean): number | undefined
{
    if (pixi8)
    {
        const stroke = style.stroke;

        if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
        {
            const width = (stroke as Record<string, unknown>).width;

            return typeof width === 'number' ? width : 0;
        }

        if (stroke === undefined || stroke === null)
        {
            return 0;
        }

        return undefined;
    }

    const thickness = style.strokeThickness;

    return typeof thickness === 'number' ? thickness : undefined;
}

export function writeStrokeWidth(style: StyleRecord, value: number, pixi8: boolean)
{
    if (!pixi8)
    {
        style.strokeThickness = value;

        return;
    }

    const stroke = style.stroke;

    if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
    {
        style.stroke = { ...(stroke as Record<string, unknown>), width: value };

        return;
    }

    if (typeof stroke === 'string' || typeof stroke === 'number')
    {
        style.stroke = { color: stroke, width: value };

        return;
    }

    style.stroke = { width: value };
}

export function readStrokeJoin(style: StyleRecord, pixi8: boolean): string | undefined
{
    if (pixi8)
    {
        const stroke = style.stroke;

        if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
        {
            const join = (stroke as Record<string, unknown>).join;

            return typeof join === 'string' ? join : 'miter';
        }

        if (stroke === undefined || stroke === null)
        {
            return 'miter';
        }

        return undefined;
    }

    const join = style.lineJoin;

    return typeof join === 'string' ? join : undefined;
}

export function writeStrokeJoin(style: StyleRecord, value: string, pixi8: boolean)
{
    if (!pixi8)
    {
        style.lineJoin = value;

        return;
    }

    const stroke = style.stroke;

    if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
    {
        style.stroke = { ...(stroke as Record<string, unknown>), join: value };

        return;
    }

    style.stroke = { join: value };
}

export function readStrokeMiterLimit(style: StyleRecord, pixi8: boolean): number | undefined
{
    if (pixi8)
    {
        const stroke = style.stroke;

        if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
        {
            const miterLimit = (stroke as Record<string, unknown>).miterLimit;

            return typeof miterLimit === 'number' ? miterLimit : 10;
        }

        if (stroke === undefined || stroke === null)
        {
            return 10;
        }

        return undefined;
    }

    const miterLimit = style.miterLimit;

    return typeof miterLimit === 'number' ? miterLimit : undefined;
}

export function writeStrokeMiterLimit(style: StyleRecord, value: number, pixi8: boolean)
{
    if (!pixi8)
    {
        style.miterLimit = value;

        return;
    }

    const stroke = style.stroke;

    if (stroke && typeof stroke === 'object' && !Array.isArray(stroke))
    {
        style.stroke = { ...(stroke as Record<string, unknown>), miterLimit: value };

        return;
    }

    style.stroke = { miterLimit: value };
}
