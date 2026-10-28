import { isNodeAlive, type PageGlobals } from '../../page-ops/pixi-node';
import { isPixi8 } from '../../page-ops/types';
import { exportPropsForSection, PROPERTY_SECTION_IDS } from '../properties/catalog';
import { resolveBooleanMap, resolveNumberMap, resolveStringMap } from '../properties/keys';

import type { ExportPropSpec } from '../properties/catalog';
import type { FieldBooleanKey, FieldNumberKey, FieldStringKey, PropertyMapsPair } from '../properties/keys';
import type { NumberPropertyKey } from '../properties/node';
import type { PropertyExportSectionId } from '../shell/settings';

export type ExportPropertyMaps = PropertyMapsPair;

type ExportPropId = string;

function findExportNumber(maps: ExportPropertyMaps, key: FieldNumberKey): { get: () => number | undefined } | undefined
{
    return resolveNumberMap(maps, key);
}

function findExportBoolean(maps: ExportPropertyMaps, key: FieldBooleanKey): { get: () => boolean | undefined } | undefined
{
    return resolveBooleanMap(maps, key);
}

function findExportString(maps: ExportPropertyMaps, key: FieldStringKey): { get: () => string | undefined } | undefined
{
    return resolveStringMap(maps, key);
}

type FillStyleExport = {
    fill: string | Array<string>;
    fillGradientStops?: Array<number>;
};

function collectFillExportValue(maps: ExportPropertyMaps): FillStyleExport | undefined
{
    const mapping = maps.text.fillStops;

    if (!mapping)
    {
        return undefined;
    }

    const stops = mapping.get();

    if (!stops || stops.length === 0)
    {
        return undefined;
    }

    if (stops.length === 1)
    {
        return { fill: stops[0].color };
    }

    return {
        fill              : stops.map((stop) => stop.color),
        fillGradientStops : stops.map((stop) => stop.offset),
    };
}

function isExportPropAvailable(maps: ExportPropertyMaps, spec: ExportPropSpec): boolean
{
    if (spec.kind === 'point')
    {
        return (
            !!findExportNumber(maps, spec.xKey)
            || !!findExportNumber(maps, spec.yKey)
        );
    }

    if (spec.kind === 'number')
    {
        return !!findExportNumber(maps, spec.key);
    }

    if (spec.kind === 'boolean')
    {
        return !!findExportBoolean(maps, spec.key);
    }

    if (spec.kind === 'fill')
    {
        return !!maps.text.fillStops && maps.text.fillStops.key === spec.key;
    }

    return !!findExportString(maps, spec.key);
}

export function availableExportPropsForSection(
    sectionId: PropertyExportSectionId,
    maps: ExportPropertyMaps,
): Array<ExportPropSpec>
{
    return exportPropsForSection(sectionId).filter((spec) =>
        isExportPropAvailable(maps, spec));
}

function readPoint(
    maps: ExportPropertyMaps,
    xKey: NumberPropertyKey,
    yKey: NumberPropertyKey,
): Record<string, number> | undefined
{
    const x = findExportNumber(maps, xKey)?.get();
    const y = findExportNumber(maps, yKey)?.get();

    if (typeof x !== 'number' && typeof y !== 'number')
    {
        return undefined;
    }

    const point: Record<string, number> = {};

    if (typeof x === 'number')
    {
        point.x = x;
    }

    if (typeof y === 'number')
    {
        point.y = y;
    }

    return point;
}

function collectBlendModeExportValue(maps: ExportPropertyMaps): string | number | undefined
{
    const node = (globalThis as PageGlobals).$pixi;

    if (isNodeAlive(node))
    {
        const value = node.blendMode;

        if (typeof value === 'number' || typeof value === 'string')
        {
            return value;
        }
    }

    return findExportString(maps, 'blendMode')?.get();
}

function collectPropValue(maps: ExportPropertyMaps, spec: ExportPropSpec): unknown
{
    if (spec.kind === 'point')
    {
        return readPoint(maps, spec.xKey, spec.yKey);
    }

    if (spec.kind === 'number')
    {
        return findExportNumber(maps, spec.key)?.get();
    }

    if (spec.kind === 'boolean')
    {
        return findExportBoolean(maps, spec.key)?.get();
    }

    if (spec.kind === 'fill')
    {
        return collectFillExportValue(maps);
    }

    if (spec.key === 'blendMode')
    {
        return collectBlendModeExportValue(maps);
    }

    return findExportString(maps, spec.key)?.get();
}

function isStyleExportId(id: ExportPropId): boolean
{
    return id.startsWith('style.');
}

type StyleExportScratch = {
    props: Record<string, unknown>;
    strokeColor: unknown;
    strokeWidth: unknown;
    strokeJoin: unknown;
    strokeMiterLimit: unknown;
    hasStrokeColor: boolean;
    hasStrokeWidth: boolean;
    hasStrokeJoin: boolean;
    hasStrokeMiterLimit: boolean;
    dropShadowEnabled: boolean | undefined;
    dropShadow: Record<string, unknown>;
};

function createStyleExportScratch(): StyleExportScratch
{
    return {
        props               : {},
        strokeColor         : undefined,
        strokeWidth         : undefined,
        strokeJoin          : undefined,
        strokeMiterLimit    : undefined,
        hasStrokeColor      : false,
        hasStrokeWidth      : false,
        hasStrokeJoin       : false,
        hasStrokeMiterLimit : false,
        dropShadowEnabled   : undefined,
        dropShadow          : {},
    };
}

function collectStyleExportProp(scratch: StyleExportScratch, id: ExportPropId, value: unknown)
{
    const path = id.slice('style.'.length);

    if (path === 'fill')
    {
        if (!value || typeof value !== 'object' || Array.isArray(value))
        {
            scratch.props.fill = value;

            return;
        }

        const fillExport = value as FillStyleExport;

        if (!('fill' in fillExport))
        {
            scratch.props.fill = value;

            return;
        }

        scratch.props.fill = fillExport.fill;

        if (fillExport.fillGradientStops)
        {
            scratch.props.fillGradientStops = fillExport.fillGradientStops;
        }

        return;
    }

    if (path === 'strokeColor')
    {
        scratch.strokeColor = value;
        scratch.hasStrokeColor = true;

        return;
    }

    if (path === 'strokeWidth')
    {
        scratch.strokeWidth = value;
        scratch.hasStrokeWidth = true;

        return;
    }

    if (path === 'strokeJoin')
    {
        scratch.strokeJoin = value;
        scratch.hasStrokeJoin = true;

        return;
    }

    if (path === 'strokeMiterLimit')
    {
        scratch.strokeMiterLimit = value;
        scratch.hasStrokeMiterLimit = true;

        return;
    }

    if (path === 'dropShadow')
    {
        if (typeof value === 'boolean')
        {
            scratch.dropShadowEnabled = value;
        }

        return;
    }

    if (path.startsWith('dropShadow.'))
    {
        scratch.dropShadow[path.slice('dropShadow.'.length)] = value;

        return;
    }

    scratch.props[path] = value;
}

function buildStyleExportObject(scratch: StyleExportScratch, pixi8: boolean): Record<string, unknown> | undefined
{
    const style: Record<string, unknown> = { ...scratch.props };
    const dropShadowKeys = Object.keys(scratch.dropShadow);

    const hasStroke = scratch.hasStrokeColor
        || scratch.hasStrokeWidth
        || scratch.hasStrokeJoin
        || scratch.hasStrokeMiterLimit;

    const hasDropShadow = scratch.dropShadowEnabled !== undefined
        || dropShadowKeys.length > 0;

    if (hasStroke)
    {
        if (pixi8)
        {
            const stroke: Record<string, unknown> = {};

            if (scratch.hasStrokeColor)
            {
                stroke.color = scratch.strokeColor;
            }

            if (scratch.hasStrokeWidth)
            {
                stroke.width = scratch.strokeWidth;
            }

            if (scratch.hasStrokeJoin)
            {
                stroke.join = scratch.strokeJoin;
            }

            if (scratch.hasStrokeMiterLimit)
            {
                stroke.miterLimit = scratch.strokeMiterLimit;
            }

            style.stroke = stroke;
        }
        else
        {
            if (scratch.hasStrokeColor)
            {
                style.stroke = scratch.strokeColor;
            }

            if (scratch.hasStrokeWidth)
            {
                style.strokeThickness = scratch.strokeWidth;
            }

            if (scratch.hasStrokeJoin)
            {
                style.lineJoin = scratch.strokeJoin;
            }

            if (scratch.hasStrokeMiterLimit)
            {
                style.miterLimit = scratch.strokeMiterLimit;
            }
        }
    }

    if (hasDropShadow)
    {
        if (pixi8)
        {
            if (dropShadowKeys.length > 0)
            {
                style.dropShadow = { ...scratch.dropShadow };
            }
            else if (scratch.dropShadowEnabled !== undefined)
            {
                style.dropShadow = scratch.dropShadowEnabled;
            }
        }
        else
        {
            if (scratch.dropShadowEnabled !== undefined)
            {
                style.dropShadow = scratch.dropShadowEnabled;
            }

            if ('alpha' in scratch.dropShadow)
            {
                style.dropShadowAlpha = scratch.dropShadow.alpha;
            }

            if ('angle' in scratch.dropShadow)
            {
                style.dropShadowAngle = scratch.dropShadow.angle;
            }

            if ('blur' in scratch.dropShadow)
            {
                style.dropShadowBlur = scratch.dropShadow.blur;
            }

            if ('color' in scratch.dropShadow)
            {
                style.dropShadowColor = scratch.dropShadow.color;
            }

            if ('distance' in scratch.dropShadow)
            {
                style.dropShadowDistance = scratch.dropShadow.distance;
            }
        }
    }

    if (Object.keys(style).length === 0)
    {
        return undefined;
    }

    return style;
}

function exportUsesPixi8(): boolean
{
    const node = (globalThis as PageGlobals).$pixi;

    return isPixi8(isNodeAlive(node) ? node : null);
}

export function buildSectionExportPayload(
    maps: ExportPropertyMaps,
    sectionId: PropertyExportSectionId,
    selectedIds: ReadonlySet<ExportPropId> | 'all',
): Record<string, unknown>
{
    const payload: Record<string, unknown> = {};
    const styleScratch = createStyleExportScratch();
    let hasStyle = false;

    for (const spec of availableExportPropsForSection(sectionId, maps))
    {
        if (selectedIds !== 'all' && !selectedIds.has(spec.id))
        {
            continue;
        }

        const value = collectPropValue(maps, spec);

        if (value === undefined)
        {
            continue;
        }

        if (isStyleExportId(spec.id))
        {
            collectStyleExportProp(styleScratch, spec.id, value);

            hasStyle = true;

            continue;
        }

        payload[spec.id] = value;
    }

    if (hasStyle)
    {
        const style = buildStyleExportObject(styleScratch, exportUsesPixi8());

        if (style)
        {
            payload.style = style;
        }
    }

    return payload;
}

function exportPropsForNode(): Array<ExportPropSpec>
{
    const specs: Array<ExportPropSpec> = [];

    for (const sectionId of PROPERTY_SECTION_IDS)
    {
        for (const spec of exportPropsForSection(sectionId))
        {
            specs.push(spec);
        }
    }

    return specs;
}

export function availableExportPropsForNode(maps: ExportPropertyMaps): Array<ExportPropSpec>
{
    return exportPropsForNode().filter((spec) => isExportPropAvailable(maps, spec));
}

export function buildNodeExportPayload(
    maps: ExportPropertyMaps,
    selectedIds: ReadonlySet<ExportPropId> | 'all',
): Record<string, unknown>
{
    const payload: Record<string, unknown> = {};
    const styleScratch = createStyleExportScratch();
    let hasStyle = false;

    for (const sectionId of PROPERTY_SECTION_IDS)
    {
        for (const spec of availableExportPropsForSection(sectionId, maps))
        {
            if (selectedIds !== 'all' && !selectedIds.has(spec.id))
            {
                continue;
            }

            const value = collectPropValue(maps, spec);

            if (value === undefined)
            {
                continue;
            }

            if (isStyleExportId(spec.id))
            {
                collectStyleExportProp(styleScratch, spec.id, value);

                hasStyle = true;

                continue;
            }

            payload[spec.id] = value;
        }
    }

    if (hasStyle)
    {
        const style = buildStyleExportObject(styleScratch, exportUsesPixi8());

        if (style)
        {
            payload.style = style;
        }
    }

    return payload;
}

function exportPayloadText(payload: Record<string, unknown>): string
{
    return `${JSON.stringify(payload, null, 2)}\n`;
}

function sanitizeFileBaseName(name: string): string
{
    const trimmed = name.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ');

    return trimmed || 'export';
}

export async function copyExportPayload(payload: Record<string, unknown>): Promise<boolean>
{
    const text = exportPayloadText(payload);

    try
    {
        await navigator.clipboard.writeText(text);

        return true;
    }
    catch
    {
        try
        {
            const area = document.createElement('textarea');

            area.value = text;

            Object.assign(area.style, {
                position : 'fixed',
                left     : '-9999px',
                top      : '0',
            });

            document.body.appendChild(area);
            area.focus();
            area.select();

            const ok = document.execCommand('copy');

            area.remove();

            return ok;
        }
        catch
        {
            return false;
        }
    }
}

export function downloadExportPayload(payload: Record<string, unknown>, fileBaseName: string)
{
    const text = exportPayloadText(payload);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${sanitizeFileBaseName(fileBaseName)}.json`;
    link.rel = 'noopener';

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
