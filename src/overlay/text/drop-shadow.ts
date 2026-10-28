import {
    colorToString,
    parseColorString,
    writeColorValue,
} from './colors';

import type { StyleRecord } from './types';

export const DEFAULT_DROP_SHADOW = {
    alpha    : 1,
    angle    : Math.PI / 6,
    blur     : 0,
    color    : 'black',
    distance : 5,
};

export function readDropShadowEnabled(style: StyleRecord, pixi8: boolean): boolean | undefined
{
    const dropShadow = style.dropShadow;

    if (pixi8)
    {
        if (dropShadow === false || dropShadow === undefined || dropShadow === null)
        {
            return false;
        }

        if (dropShadow === true)
        {
            return true;
        }

        if (typeof dropShadow === 'object')
        {
            return true;
        }

        return undefined;
    }

    if (typeof dropShadow === 'boolean')
    {
        return dropShadow;
    }

    return undefined;
}

export function writeDropShadowEnabled(style: StyleRecord, value: boolean, pixi8: boolean)
{
    if (!pixi8)
    {
        style.dropShadow = value;

        return;
    }

    if (!value)
    {
        style.dropShadow = null;

        return;
    }

    if (style.dropShadow && typeof style.dropShadow === 'object')
    {
        return;
    }

    style.dropShadow = { ...DEFAULT_DROP_SHADOW };
}

export function dropShadowObject(style: StyleRecord): StyleRecord | null
{
    const dropShadow = style.dropShadow;

    if (dropShadow && typeof dropShadow === 'object')
    {
        return dropShadow as StyleRecord;
    }

    return null;
}

function ensureDropShadowObject(style: StyleRecord): StyleRecord
{
    const existing = dropShadowObject(style);

    if (existing)
    {
        return existing;
    }

    const created = { ...DEFAULT_DROP_SHADOW };

    style.dropShadow = created;

    return created;
}

export function readDropShadowNumber(style: StyleRecord, pixi8: boolean, v8Key: string, v7Key: string): number | undefined
{
    if (pixi8)
    {
        const obj = dropShadowObject(style);

        if (!obj)
        {
            return undefined;
        }

        const value = obj[v8Key];

        return typeof value === 'number' ? value : undefined;
    }

    const value = style[v7Key];

    return typeof value === 'number' ? value : undefined;
}

export function writeDropShadowNumber(style: StyleRecord, pixi8: boolean, v8Key: string, v7Key: string, value: number)
{
    if (pixi8)
    {
        const obj = ensureDropShadowObject(style);

        obj[v8Key] = value;
        style.dropShadow = { ...obj };

        return;
    }

    style[v7Key] = value;
}

export function readDropShadowColor(style: StyleRecord, pixi8: boolean): string | undefined
{
    if (pixi8)
    {
        const obj = dropShadowObject(style);

        if (!obj)
        {
            return undefined;
        }

        return colorToString(obj.color) ?? '';
    }

    const color = style.dropShadowColor;

    if (color === undefined || color === null)
    {
        return undefined;
    }

    return colorToString(color) ?? '';
}

export function writeDropShadowColor(style: StyleRecord, value: string, pixi8: boolean)
{
    const parsed = parseColorString(value);

    if (pixi8)
    {
        const obj = ensureDropShadowObject(style);

        obj.color = writeColorValue(obj.color, parsed);
        style.dropShadow = { ...obj };

        return;
    }

    style.dropShadowColor = writeColorValue(style.dropShadowColor, parsed);
}
