import {
    colorToString,
    cssColorToHex6,
    isPlainColorSource,
    isRgbColorArray,
    parseColorString,
    writeColorValue,
} from './colors';

import type { PageGlobals } from '../../page-ops/pixi-node';
import type { FillColorStop, FillGradientType, StyleRecord } from './types';

const FILL_GRADIENT_VERTICAL = 0;
const FILL_GRADIENT_HORIZONTAL = 1;

type FillGradientLike = {
    colorStops: Array<{ offset: number; color: unknown }>;
    type?: unknown;
    start?: { x?: unknown; y?: unknown };
    end?: { x?: unknown; y?: unknown };
    textureSpace?: unknown;
};

function isFillGradientLike(value: unknown): value is FillGradientLike
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const record = value as Record<string, unknown>;

    if (!Array.isArray(record.colorStops))
    {
        return false;
    }

    return record.colorStops.every((stop) =>
    {
        if (!stop || typeof stop !== 'object')
        {
            return false;
        }

        const entry = stop as Record<string, unknown>;

        return typeof entry.offset === 'number' && Number.isFinite(entry.offset);
    });
}

function pointFromUnknown(
    value: { x?: unknown; y?: unknown } | undefined,
    fallback: { x: number; y: number },
): { x: number; y: number }
{
    const x = typeof value?.x === 'number' && Number.isFinite(value.x)
        ? value.x
        : fallback.x;

    const y = typeof value?.y === 'number' && Number.isFinite(value.y)
        ? value.y
        : fallback.y;

    return { x, y };
}

function readGradientStops(gradient: FillGradientLike): Array<FillColorStop> | undefined
{
    const stops: Array<FillColorStop> = [];

    for (const stop of gradient.colorStops)
    {
        const color = normalizeFillColor(colorToString(stop.color));

        if (color === undefined)
        {
            continue;
        }

        stops.push({ color, offset: normalizeFillOffset(stop.offset) });
    }

    return stops.length > 0 ? stops : undefined;
}

function readFillColor(style: StyleRecord): string | undefined
{
    const fill = style.fill;

    if (fill === undefined || fill === null)
    {
        return undefined;
    }

    if (isFillGradientLike(fill))
    {
        return undefined;
    }

    const direct = colorToString(fill);

    if (direct !== undefined)
    {
        return direct;
    }

    if (fill && typeof fill === 'object' && !Array.isArray(fill) && !isRgbColorArray(fill))
    {
        const record = fill as Record<string, unknown>;

        if (isFillGradientLike(record.fill))
        {
            return undefined;
        }

        if ('color' in record)
        {
            return colorToString(record.color);
        }

        if (!isPlainColorSource(fill))
        {
            return undefined;
        }

        return colorToString(record.color);
    }

    return undefined;
}

function writeFillColor(style: StyleRecord, value: string)
{
    const parsed = parseColorString(value);
    const current = style.fill;

    if (
        isFillGradientLike(current)
        || (
            current
            && typeof current === 'object'
            && isFillGradientLike((current as Record<string, unknown>).fill)
        )
    )
    {
        style.fill = parsed;

        return;
    }
    style.fill = writeColorValue(current, parsed);
}

function normalizeFillColor(value: string | undefined): string | undefined
{
    if (value === undefined)
    {
        return undefined;
    }

    const trimmed = value.trim();
    const bare = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

    if ((/^[0-9a-fA-F]{3}$/).test(bare) || (/^[0-9a-fA-F]{6}$/).test(bare))
    {
        return cssColorToHex6(`#${bare}`) ?? `#${bare.toLowerCase()}`;
    }

    if ((/^[0-9a-fA-F]{8}$/).test(bare))
    {
        return cssColorToHex6(`#${bare.slice(0, 6)}`) ?? `#${bare.slice(0, 6).toLowerCase()}`;
    }

    return cssColorToHex6(trimmed) ?? trimmed;
}

function normalizeFillOffset(value: number): number
{
    return Math.round(value * 10000) / 10000;
}

type FillGradientCtor = new (...args: Array<unknown>) => unknown;

type GradientMutable = FillGradientLike & {
    colorStops: Array<{ offset: number; color: string | number }>;
    texture?: unknown;
    addColorStop?: (offset: number, color: string | number) => unknown;
    buildGradient?: () => void;
    destroy?: () => void;
};

const fillGradientCtorCache = new WeakMap<object, FillGradientCtor | null>();

function ctorFromUnknown(value: unknown): FillGradientCtor | null
{
    if (!value || typeof value !== 'object')
    {
        return null;
    }

    const ctor = (value as { constructor?: unknown }).constructor;

    if (typeof ctor !== 'function')
    {
        return null;
    }

    if (ctor === Object || ctor === Array)
    {
        return null;
    }

    return ctor as FillGradientCtor;
}

function gradientFromFill(fill: unknown): FillGradientLike | null
{
    if (isFillGradientLike(fill))
    {
        return fill;
    }

    if (!fill || typeof fill !== 'object' || Array.isArray(fill))
    {
        return null;
    }

    const nested = (fill as Record<string, unknown>).fill;

    return isFillGradientLike(nested) ? nested : null;
}

function hasFinitePoint(point: { x?: unknown; y?: unknown } | undefined): boolean
{
    return typeof point?.x === 'number'
        && Number.isFinite(point.x)
        && typeof point?.y === 'number'
        && Number.isFinite(point.y);
}

function isUsableLinearGradient(value: unknown): value is GradientMutable
{
    if (!isFillGradientLike(value))
    {
        return false;
    }

    if (value.type === 'radial')
    {
        return false;
    }

    return hasFinitePoint(value.start) && hasFinitePoint(value.end);
}

function releaseTempStyle(temp: { destroy?: (options?: unknown) => void })
{
    try
    {
        temp.destroy?.(false);
    }
    catch
    {
        void 0;
    }
}

function probeFillGradientCtor(owner: object): FillGradientCtor | null
{
    try
    {
        const StyleCtor = owner as new (options: Record<string, unknown>) => {
            fill?: unknown;
            destroy?: (options?: unknown) => void;
        };

        const temp = new StyleCtor({
            fill              : ['#ffffff', '#000000'],
            fillGradientStops : [0, 1],
        });

        const gradient = gradientFromFill(temp.fill);
        const ctor = gradient ? ctorFromUnknown(gradient) : null;

        if (gradient && typeof (gradient as GradientMutable).destroy === 'function')
        {
            try
            {
                (gradient as GradientMutable).destroy?.();
            }
            catch
            {
                void 0;
            }
        }

        releaseTempStyle(temp);

        return ctor;
    }
    catch
    {
        return null;
    }
}

function getFillGradientCtor(style: StyleRecord): FillGradientCtor | null
{
    const owner = style.constructor;

    if (typeof owner === 'function' && owner !== Object)
    {
        const cached = fillGradientCtorCache.get(owner);

        if (cached !== undefined)
        {
            return cached;
        }

        const probed = probeFillGradientCtor(owner);

        fillGradientCtorCache.set(owner, probed);

        if (probed)
        {
            return probed;
        }
    }

    const fromFill = ctorFromUnknown(gradientFromFill(style.fill));

    if (fromFill)
    {
        return fromFill;
    }

    const fromPixi = (globalThis as PageGlobals).PIXI?.FillGradient;

    return typeof fromPixi === 'function' ? fromPixi as FillGradientCtor : null;
}

function applyGradientStops(gradient: GradientMutable, stops: Array<{ color: string | number; offset: number }>)
{
    const nextStops = stops
        .map((stop) => ({
            color  : stop.color,
            offset : stop.offset,
        }))
        .sort((left, right) => left.offset - right.offset);

    try
    {
        gradient.colorStops = [];
    }
    catch
    {
        gradient.colorStops.length = 0;
    }

    if (typeof gradient.addColorStop === 'function')
    {
        for (const stop of nextStops)
        {
            gradient.addColorStop(stop.offset, stop.color);
        }
    }

    if (gradient.colorStops.length !== nextStops.length)
    {
        gradient.colorStops = nextStops;
    }

    gradient.texture = null;

    if (typeof gradient.buildGradient === 'function')
    {
        try
        {
            gradient.buildGradient();
        }
        catch
        {
            gradient.texture = null;
        }
    }
}

function styleFontSize(style: StyleRecord): number
{
    return typeof style.fontSize === 'number' && style.fontSize > 0
        ? style.fontSize
        : 26;
}

function pointsForGradientType(
    type: FillGradientType,
    textureSpace: 'local' | 'global',
    fontSize: number,
): { start: { x: number; y: number }; end: { x: number; y: number } }
{
    const extent = textureSpace === 'global' ? Math.max(1, fontSize) : 1;

    if (type === 'horizontal')
    {
        return {
            start : { x: 0, y: 0 },
            end   : { x: extent, y: 0 },
        };
    }

    return {
        start : { x: 0, y: 0 },
        end   : { x: 0, y: extent },
    };
}

function gradientTypeFromPoints(
    start: { x: number; y: number },
    end: { x: number; y: number },
): FillGradientType
{
    return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
        ? 'horizontal'
        : 'vertical';
}

function normalizeFillGradientType(value: unknown): FillGradientType | undefined
{
    if (value === 'horizontal' || value === FILL_GRADIENT_HORIZONTAL || value === 1)
    {
        return 'horizontal';
    }

    if (value === 'vertical' || value === FILL_GRADIENT_VERTICAL || value === 0)
    {
        return 'vertical';
    }

    return undefined;
}

function exportFillGradientTypeValue(type: FillGradientType): number
{
    return type === 'horizontal' ? FILL_GRADIENT_HORIZONTAL : FILL_GRADIENT_VERTICAL;
}

function createLinearFillGradient(
    FillGradient: FillGradientCtor,
    stops: Array<{ color: string | number; offset: number }>,
    existing: FillGradientLike | null,
    fontSize: number,
    type?: FillGradientType,
): GradientMutable | null
{
    const textureSpace = existing?.textureSpace === 'global' ? 'global' : 'local';

    let start: { x: number; y: number };
    let end: { x: number; y: number };

    if (type)
    {
        ({ start, end } = pointsForGradientType(type, textureSpace, fontSize));
    }
    else if (hasFinitePoint(existing?.start) && hasFinitePoint(existing?.end))
    {
        start = pointFromUnknown(existing?.start, { x: 0, y: 0 });
        end = pointFromUnknown(existing?.end, { x: 0, y: 1 });
    }
    else
    {
        ({ start, end } = pointsForGradientType('vertical', textureSpace, fontSize));
    }

    let gradient: unknown = null;

    try
    {
        gradient = new FillGradient({
            type: 'linear',
            start,
            end,
            textureSpace,
        });
    }
    catch
    {
        gradient = null;
    }

    if (!isUsableLinearGradient(gradient))
    {
        try
        {
            gradient = new FillGradient(start.x, start.y, end.x, end.y, textureSpace);
        }
        catch
        {
            return null;
        }
    }

    if (!isUsableLinearGradient(gradient))
    {
        return null;
    }

    try
    {
        gradient.textureSpace = textureSpace;
    }
    catch
    {
        void 0;
    }

    if (gradient.textureSpace === 'global' && type === 'vertical')
    {
        gradient.end = {
            x : end.x,
            y : Math.max(Math.abs(end.y), fontSize),
        };
    }

    applyGradientStops(gradient, stops);

    return gradient;
}

function applyLinearGradientType(
    gradient: GradientMutable,
    type: FillGradientType,
    fontSize: number,
)
{
    const textureSpace = gradient.textureSpace === 'global' ? 'global' : 'local';
    const { start, end } = pointsForGradientType(type, textureSpace, fontSize);

    gradient.start = start;
    gradient.end = end;
    gradient.texture = null;

    if (typeof gradient.buildGradient === 'function')
    {
        try
        {
            gradient.buildGradient();
        }
        catch
        {
            gradient.texture = null;
        }
    }
}

function assignFillGradient(style: StyleRecord, gradient: GradientMutable)
{
    if (style.fill === gradient)
    {
        style.fill = { fill: gradient };

        return;
    }

    style.fill = gradient;
}

function writePixi8GradientFill(
    style: StyleRecord,
    stops: Array<{ color: string | number; offset: number }>,
    existing: FillGradientLike | null,
): boolean
{
    const fontSize = styleFontSize(style);

    if (
        existing
        && existing.type !== 'radial'
        && typeof (existing as GradientMutable).addColorStop === 'function'
    )
    {
        const gradient = existing as GradientMutable;

        applyGradientStops(gradient, stops);
        assignFillGradient(style, gradient);

        return true;
    }

    const FillGradient = getFillGradientCtor(style);

    if (!FillGradient)
    {
        return false;
    }

    const gradient = createLinearFillGradient(FillGradient, stops, existing, fontSize);

    if (!gradient)
    {
        return false;
    }

    assignFillGradient(style, gradient);

    return true;
}

function readGradientStopOffsets(style: StyleRecord, colorCount: number): Array<number> | undefined
{
    const raw = style.fillGradientStops;

    if (!Array.isArray(raw) || raw.length !== colorCount)
    {
        return undefined;
    }

    const offsets = raw.filter((entry): entry is number =>
        typeof entry === 'number' && Number.isFinite(entry));

    return offsets.length === colorCount ? offsets : undefined;
}

export function readFillStops(style: StyleRecord): Array<FillColorStop> | undefined
{
    const fill = style.fill;

    if (fill === undefined || fill === null)
    {
        return undefined;
    }

    if (isFillGradientLike(fill))
    {
        return readGradientStops(fill);
    }

    if (Array.isArray(fill) && !isRgbColorArray(fill))
    {
        const entries = fill as Array<unknown>;
        const stopsFromObjects: Array<FillColorStop> = [];
        const colors: Array<string> = [];

        for (const entry of entries)
        {
            if (entry && typeof entry === 'object' && !Array.isArray(entry))
            {
                const record = entry as Record<string, unknown>;
                const color = colorToString(record.color);
                const offset = record.offset;
                const normalized = normalizeFillColor(color);

                if (
                    normalized !== undefined
                    && typeof offset === 'number'
                    && Number.isFinite(offset)
                )
                {
                    stopsFromObjects.push({
                        color  : normalized,
                        offset : normalizeFillOffset(offset),
                    });

                    continue;
                }
            }

            const color = normalizeFillColor(colorToString(entry));

            if (color !== undefined)
            {
                colors.push(color);
            }
        }

        if (stopsFromObjects.length > 0 && colors.length === 0)
        {
            return stopsFromObjects;
        }

        if (colors.length === 0)
        {
            return undefined;
        }

        if (colors.length === 1)
        {
            return [{ color: colors[0], offset: 0 }];
        }

        const offsets = readGradientStopOffsets(style, colors.length);

        return colors.map((color, index) => ({
            color,
            offset: normalizeFillOffset(offsets
                ? offsets[index]
                : index / (colors.length - 1)),
        }));
    }

    if (fill && typeof fill === 'object' && !isRgbColorArray(fill))
    {
        const record = fill as Record<string, unknown>;

        if (isFillGradientLike(record.fill))
        {
            return readGradientStops(record.fill);
        }
    }

    const single = readFillColor(style);

    if (single === undefined)
    {
        return undefined;
    }

    const normalized = normalizeFillColor(single);

    if (normalized === undefined)
    {
        return undefined;
    }

    return [{ color: normalized, offset: 0 }];
}

export function writeFillStops(style: StyleRecord, stops: Array<FillColorStop>, pixi8: boolean)
{
    if (stops.length === 0)
    {
        return;
    }

    if (stops.length === 1)
    {
        writeFillColor(style, stops[0].color);

        if (Object.prototype.hasOwnProperty.call(style, 'fillGradientStops'))
        {
            delete style.fillGradientStops;
        }

        return;
    }

    const normalized = stops.map((stop) => ({
        color  : parseColorString(stop.color),
        offset : Math.max(0, Math.min(1, stop.offset)),
    }));

    const current = style.fill;
    let existing: FillGradientLike | null = null;

    if (isFillGradientLike(current))
    {
        existing = current;
    }
    else if (current && typeof current === 'object' && !Array.isArray(current))
    {
        const nested = (current as Record<string, unknown>).fill;

        if (isFillGradientLike(nested))
        {
            existing = nested;
        }
    }

    if (pixi8)
    {
        if (Object.prototype.hasOwnProperty.call(style, 'fillGradientStops'))
        {
            delete style.fillGradientStops;
        }

        writePixi8GradientFill(style, normalized, existing);

        return;
    }

    style.fill = normalized.map((stop) => stop.color);
    style.fillGradientStops = normalized.map((stop) => stop.offset);
}

export function readFillGradientType(style: StyleRecord, pixi8: boolean): FillGradientType | undefined
{
    const stops = readFillStops(style);

    if (!stops || stops.length < 2)
    {
        return undefined;
    }

    if (pixi8)
    {
        const gradient = gradientFromFill(style.fill);

        if (!gradient || gradient.type === 'radial')
        {
            return undefined;
        }

        if (hasFinitePoint(gradient.start) && hasFinitePoint(gradient.end))
        {
            return gradientTypeFromPoints(
                pointFromUnknown(gradient.start, { x: 0, y: 0 }),
                pointFromUnknown(gradient.end, { x: 0, y: 1 }),
            );
        }

        return 'vertical';
    }

    return normalizeFillGradientType(style.fillGradientType) ?? 'vertical';
}

export function writeFillGradientType(
    style: StyleRecord,
    value: FillGradientType,
    pixi8: boolean,
)
{
    const type = value === 'horizontal' ? 'horizontal' : 'vertical';
    const stops = readFillStops(style);

    if (!stops || stops.length < 2)
    {
        return;
    }

    if (!pixi8)
    {
        style.fillGradientType = exportFillGradientTypeValue(type);

        return;
    }

    const existing = gradientFromFill(style.fill);
    const fontSize = styleFontSize(style);

    if (
        existing
        && existing.type !== 'radial'
        && typeof (existing as GradientMutable).addColorStop === 'function'
        && isUsableLinearGradient(existing)
    )
    {
        applyLinearGradientType(existing as GradientMutable, type, fontSize);
        assignFillGradient(style, existing as GradientMutable);

        return;
    }

    const FillGradient = getFillGradientCtor(style);

    if (!FillGradient)
    {
        return;
    }

    const normalized = stops.map((stop) => ({
        color  : parseColorString(stop.color),
        offset : Math.max(0, Math.min(1, stop.offset)),
    }));

    const gradient = createLinearFillGradient(
        FillGradient,
        normalized,
        existing,
        fontSize,
        type,
    );

    if (!gradient)
    {
        return;
    }

    assignFillGradient(style, gradient);
}

