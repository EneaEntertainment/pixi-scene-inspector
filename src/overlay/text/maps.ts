import { isNodeAlive, type PageGlobals, type PixiNode } from '../../page-ops/pixi-node';
import { isPixi8, typeNameOf } from '../../page-ops/types';
import {
    DEFAULT_DROP_SHADOW,
    dropShadowObject,
    readDropShadowColor,
    readDropShadowEnabled,
    readDropShadowNumber,
    writeDropShadowColor,
    writeDropShadowEnabled,
    writeDropShadowNumber,
} from './drop-shadow';
import {
    readFillGradientType,
    readFillStops,
    writeFillGradientType,
    writeFillStops,
} from './fill';
import { legacyBitmapTextMaps } from './legacy-bitmap';
import {
    readStrokeColor,
    readStrokeJoin,
    readStrokeMiterLimit,
    readStrokeWidth,
    writeStrokeColor,
    writeStrokeJoin,
    writeStrokeMiterLimit,
    writeStrokeWidth,
} from './stroke';
import { fontFamilyMap, fontSizeMap, styleBooleanMap, styleNumberMap, styleStringMap } from './style-maps';

import type {
    FillStopsMapping,
    PropertyMapping,
    StyleRecord,
    TextBooleanPropertyKey,
    TextNumberPropertyKey,
    TextPropertyMaps,
    TextStringPropertyKey,
} from './types';

const TEXT_TYPE_NAMES = new Set([
    'Text',
    'BitmapText',
    'HTMLText',
    'SplitText',
    'SplitBitmapText',
]);

function isTextNode(node: PixiNode, win: PageGlobals): boolean
{
    const typeName = typeNameOf(node, win);

    if (TEXT_TYPE_NAMES.has(typeName))
    {
        return true;
    }

    if (typeof node.text === 'string' || typeof node.text === 'number')
    {
        return !!node.style && typeof node.style === 'object';
    }

    return false;
}

function styleOf(node: PixiNode): StyleRecord | null
{
    const style = node.style;

    if (!style || typeof style !== 'object')
    {
        return null;
    }

    return style as StyleRecord;
}

export function textMapsForNode(node: PixiNode | null | undefined): TextPropertyMaps
{
    if (!isNodeAlive(node))
    {
        return { numbers: [], booleans: [], strings: [], fillStops: null };
    }

    const win = globalThis as PageGlobals;

    if (!isTextNode(node, win))
    {
        return { numbers: [], booleans: [], strings: [], fillStops: null };
    }

    const style = styleOf(node);

    if (!style)
    {
        if (typeNameOf(node, win) === 'BitmapText')
        {
            return legacyBitmapTextMaps(node);
        }

        return { numbers: [], booleans: [], strings: [], fillStops: null };
    }

    const numbers: Array<PropertyMapping<number>> = [];
    const booleans: Array<PropertyMapping<boolean>> = [];
    const strings: Array<PropertyMapping<string>> = [];
    let fillStops: FillStopsMapping | null = null;
    const pixi8 = isPixi8(node, win);

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
                node.text = value;
            },
        });
    }

    const fontFamily = fontFamilyMap(style);

    if (fontFamily)
    {
        strings.push(fontFamily);
    }

    const fontSize = fontSizeMap(style);

    if (fontSize)
    {
        numbers.push(fontSize);
    }

    const fontWeight = styleStringMap(style, 'style.fontWeight', 'fontWeight');

    if (fontWeight)
    {
        strings.push(fontWeight);
    }

    const fontStyle = styleStringMap(style, 'style.fontStyle', 'fontStyle');

    if (fontStyle)
    {
        strings.push(fontStyle);
    }

    const fontVariant = styleStringMap(style, 'style.fontVariant', 'fontVariant');

    if (fontVariant)
    {
        strings.push(fontVariant);
    }

    if (readFillStops(style) !== undefined)
    {
        fillStops = {
            key : 'style.fill',
            get : () => readFillStops(style),
            set : (value) =>
            {
                writeFillStops(style, value, pixi8);
            },
        };
    }

    if (readFillGradientType(style, pixi8) !== undefined)
    {
        strings.push({
            key : 'style.fillGradientType',
            get : () => readFillGradientType(style, pixi8),
            set : (value) =>
            {
                if (value !== 'horizontal' && value !== 'vertical')
                {
                    return;
                }

                writeFillGradientType(style, value, pixi8);
            },
        });
    }

    const align = styleStringMap(style, 'style.align', 'align');

    if (align)
    {
        strings.push(align);
    }

    const letterSpacing = styleNumberMap(style, 'style.letterSpacing', 'letterSpacing');

    if (letterSpacing)
    {
        numbers.push(letterSpacing);
    }

    const lineHeight = styleNumberMap(style, 'style.lineHeight', 'lineHeight');

    if (lineHeight)
    {
        numbers.push(lineHeight);
    }

    const leading = styleNumberMap(style, 'style.leading', 'leading');

    if (leading)
    {
        numbers.push(leading);
    }

    const padding = styleNumberMap(style, 'style.padding', 'padding');

    if (padding)
    {
        numbers.push(padding);
    }

    const wordWrap = styleBooleanMap(style, 'style.wordWrap', 'wordWrap');

    if (wordWrap)
    {
        booleans.push(wordWrap);
    }

    const wordWrapWidth = styleNumberMap(style, 'style.wordWrapWidth', 'wordWrapWidth');

    if (wordWrapWidth)
    {
        numbers.push(wordWrapWidth);
    }

    const breakWords = styleBooleanMap(style, 'style.breakWords', 'breakWords');

    if (breakWords)
    {
        booleans.push(breakWords);
    }

    const whiteSpace = styleStringMap(style, 'style.whiteSpace', 'whiteSpace');

    if (whiteSpace)
    {
        strings.push(whiteSpace);
    }

    const textBaseline = styleStringMap(style, 'style.textBaseline', 'textBaseline');

    if (textBaseline)
    {
        strings.push(textBaseline);
    }

    const trim = styleBooleanMap(style, 'style.trim', 'trim');

    if (trim)
    {
        booleans.push(trim);
    }

    if (readStrokeColor(style, pixi8) !== undefined)
    {
        strings.push({
            key : 'style.strokeColor',
            get : () => readStrokeColor(style, pixi8),
            set : (value) =>
            {
                writeStrokeColor(style, value, pixi8);
            },
        });
    }

    if (readStrokeWidth(style, pixi8) !== undefined)
    {
        numbers.push({
            key : 'style.strokeWidth',
            get : () => readStrokeWidth(style, pixi8),
            set : (value) =>
            {
                writeStrokeWidth(style, value, pixi8);
            },
        });
    }

    if (readStrokeJoin(style, pixi8) !== undefined)
    {
        strings.push({
            key : 'style.strokeJoin',
            get : () => readStrokeJoin(style, pixi8),
            set : (value) =>
            {
                writeStrokeJoin(style, value, pixi8);
            },
        });
    }

    if (readStrokeMiterLimit(style, pixi8) !== undefined)
    {
        numbers.push({
            key : 'style.strokeMiterLimit',
            get : () => readStrokeMiterLimit(style, pixi8),
            set : (value) =>
            {
                writeStrokeMiterLimit(style, value, pixi8);
            },
        });
    }

    if (readDropShadowEnabled(style, pixi8) !== undefined)
    {
        booleans.push({
            key : 'style.dropShadow',
            get : () => readDropShadowEnabled(style, pixi8),
            set : (value) =>
            {
                writeDropShadowEnabled(style, value, pixi8);
            },
        });
    }

    const shadowActive = pixi8
        ? !!dropShadowObject(style)
        : style.dropShadow === true;

    if (shadowActive)
    {
        numbers.push({
            key : 'style.dropShadow.alpha',
            get : () =>
                readDropShadowNumber(style, pixi8, 'alpha', 'dropShadowAlpha')
                ?? DEFAULT_DROP_SHADOW.alpha,
            set: (value) =>
            {
                writeDropShadowNumber(
                    style,
                    pixi8,
                    'alpha',
                    'dropShadowAlpha',
                    value,
                );
            },
        });

        numbers.push({
            key : 'style.dropShadow.angle',
            get : () =>
                readDropShadowNumber(style, pixi8, 'angle', 'dropShadowAngle')
                ?? DEFAULT_DROP_SHADOW.angle,
            set: (value) =>
            {
                writeDropShadowNumber(
                    style,
                    pixi8,
                    'angle',
                    'dropShadowAngle',
                    value,
                );
            },
        });

        numbers.push({
            key : 'style.dropShadow.blur',
            get : () =>
                readDropShadowNumber(style, pixi8, 'blur', 'dropShadowBlur')
                ?? DEFAULT_DROP_SHADOW.blur,
            set: (value) =>
            {
                writeDropShadowNumber(
                    style,
                    pixi8,
                    'blur',
                    'dropShadowBlur',
                    value,
                );
            },
        });

        strings.push({
            key : 'style.dropShadow.color',
            get : () =>
                readDropShadowColor(style, pixi8)
                ?? String(DEFAULT_DROP_SHADOW.color),
            set: (value) =>
            {
                writeDropShadowColor(style, value, pixi8);
            },
        });

        numbers.push({
            key : 'style.dropShadow.distance',
            get : () =>
                readDropShadowNumber(
                    style,
                    pixi8,
                    'distance',
                    'dropShadowDistance',
                ) ?? DEFAULT_DROP_SHADOW.distance,
            set: (value) =>
            {
                writeDropShadowNumber(
                    style,
                    pixi8,
                    'distance',
                    'dropShadowDistance',
                    value,
                );
            },
        });
    }

    return { numbers, booleans, strings, fillStops };
}

export function findTextNumberMap(maps: TextPropertyMaps, key: TextNumberPropertyKey): PropertyMapping<number> | undefined
{
    return maps.numbers.find((entry) => entry.key === key);
}

export function findTextBooleanMap(maps: TextPropertyMaps, key: TextBooleanPropertyKey): PropertyMapping<boolean> | undefined
{
    return maps.booleans.find((entry) => entry.key === key);
}

export function findTextStringMap(maps: TextPropertyMaps, key: TextStringPropertyKey): PropertyMapping<string> | undefined
{
    return maps.strings.find((entry) => entry.key === key);
}
