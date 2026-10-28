import { colorToString, parseColorString } from './colors';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { PropertyMapping, TextPropertyMaps } from './types';

function readLegacyNumber(node: PixiNode, key: 'fontSize' | 'letterSpacing' | 'maxWidth'): number | undefined
{
    try
    {
        const value = node[key];

        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }
    catch
    {
        return undefined;
    }
}

function readLegacyString(node: PixiNode, key: 'fontName' | 'align'): string | undefined
{
    try
    {
        const value = node[key];

        return typeof value === 'string' ? value : undefined;
    }
    catch
    {
        return undefined;
    }
}

function readLegacyTint(node: PixiNode): string | undefined
{
    try
    {
        return colorToString(node.tint);
    }
    catch
    {
        return undefined;
    }
}

function assignLegacyText(node: PixiNode, value: string)
{
    try
    {
        node.text = value;
    }
    catch
    {
        void 0;
    }
}

function assignLegacyFontName(node: PixiNode, value: string)
{
    try
    {
        node.fontName = value;
    }
    catch
    {
        void 0;
    }
}

function assignLegacyFontSize(node: PixiNode, value: number)
{
    try
    {
        node.fontSize = value;
    }
    catch
    {
        void 0;
    }
}

function assignLegacyAlign(node: PixiNode, value: string)
{
    try
    {
        node.align = value;
    }
    catch
    {
        void 0;
    }
}

function assignLegacyLetterSpacing(node: PixiNode, value: number)
{
    try
    {
        node.letterSpacing = value;
    }
    catch
    {
        void 0;
    }
}

function assignLegacyMaxWidth(node: PixiNode, value: number)
{
    try
    {
        node.maxWidth = value;
    }
    catch
    {
        void 0;
    }
}

function assignLegacyTint(node: PixiNode, value: string | number)
{
    try
    {
        node.tint = value;
    }
    catch
    {
        void 0;
    }
}

export function legacyBitmapTextMaps(node: PixiNode): TextPropertyMaps
{
    const numbers: Array<PropertyMapping<number>> = [];
    const strings: Array<PropertyMapping<string>> = [];

    if (typeof node.text === 'string' || typeof node.text === 'number')
    {
        strings.push({
            key : 'text',
            get : () =>
            {
                const value = node.text;

                if (typeof value === 'string')
                {
                    return value;
                }

                if (typeof value === 'number')
                {
                    return String(value);
                }

                return undefined;
            },
            set: (value) =>
            {
                assignLegacyText(node, value);
            },
        });
    }

    if (readLegacyString(node, 'fontName') !== undefined)
    {
        strings.push({
            key : 'style.fontName',
            get : () => readLegacyString(node, 'fontName'),
            set : (value) =>
            {
                assignLegacyFontName(node, value);
            },
        });
    }

    if (readLegacyNumber(node, 'fontSize') !== undefined)
    {
        numbers.push({
            key : 'style.fontSize',
            get : () => readLegacyNumber(node, 'fontSize'),
            set : (value) =>
            {
                assignLegacyFontSize(node, value);
            },
        });
    }

    if (readLegacyTint(node) !== undefined)
    {
        strings.push({
            key : 'style.tint',
            get : () => readLegacyTint(node),
            set : (value) =>
            {
                assignLegacyTint(node, parseColorString(value));
            },
        });
    }

    if (readLegacyString(node, 'align') !== undefined)
    {
        strings.push({
            key : 'style.align',
            get : () => readLegacyString(node, 'align'),
            set : (value) =>
            {
                assignLegacyAlign(node, value);
            },
        });
    }

    if (readLegacyNumber(node, 'letterSpacing') !== undefined)
    {
        numbers.push({
            key : 'style.letterSpacing',
            get : () => readLegacyNumber(node, 'letterSpacing'),
            set : (value) =>
            {
                assignLegacyLetterSpacing(node, value);
            },
        });
    }

    if (readLegacyNumber(node, 'maxWidth') !== undefined)
    {
        numbers.push({
            key : 'style.maxWidth',
            get : () => readLegacyNumber(node, 'maxWidth'),
            set : (value) =>
            {
                assignLegacyMaxWidth(node, value);
            },
        });
    }

    return { numbers, booleans: [], strings, fillStops: null };
}
