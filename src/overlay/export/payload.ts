import { isNodeAlive, type PageGlobals } from '../../page-ops/pixi-node';
import { isPixi8 } from '../../page-ops/types';
import { exportPropsForSection, PROPERTY_SECTION_IDS } from '../properties/catalog';
import { resolveBooleanMap, resolveNumberMap, resolveStringMap } from '../properties/keys';

import type { ExportPropSpec } from '../properties/catalog';
import type { PropertyMapsPair } from '../properties/keys';
import type { NumberPropertyKey } from '../properties/node';
import type { PropertyExportSectionId } from '../shell/settings';

export type ExportPropertyMaps = PropertyMapsPair;

type ExportPropId = string;

type FillStyleExport = {
    fill: string | Array<string>;
    fillGradientStops?: Array<number>;
    fillGradientType?: number;
};

function fillGradientTypeExportValue(maps: ExportPropertyMaps): number | undefined
{
    const value = resolveStringMap(maps, 'style.fillGradientType')?.get();

    if (value === 'horizontal')
    {
        return 1;
    }

    if (value === 'vertical')
    {
        return 0;
    }

    return undefined;
}

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

    const fillGradientType = fillGradientTypeExportValue(maps);

    return {
        fill              : stops.map((stop) => stop.color),
        fillGradientStops : stops.map((stop) => stop.offset),
        ...(fillGradientType === undefined ? {} : { fillGradientType }),
    };
}

function isExportPropAvailable(maps: ExportPropertyMaps, spec: ExportPropSpec): boolean
{
    if (spec.kind === 'point')
    {
        return (
            !!resolveNumberMap(maps, spec.xKey)
            || !!resolveNumberMap(maps, spec.yKey)
            || (!!spec.zKey && !!resolveNumberMap(maps, spec.zKey))
        );
    }

    if (spec.kind === 'number')
    {
        return !!resolveNumberMap(maps, spec.key);
    }

    if (spec.kind === 'boolean')
    {
        return !!resolveBooleanMap(maps, spec.key);
    }

    if (spec.kind === 'fill')
    {
        return !!maps.text.fillStops && maps.text.fillStops.key === spec.key;
    }

    return !!resolveStringMap(maps, spec.key);
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
    zKey?: NumberPropertyKey,
): Record<string, number> | undefined
{
    const x = resolveNumberMap(maps, xKey)?.get();
    const y = resolveNumberMap(maps, yKey)?.get();
    const z = zKey ? resolveNumberMap(maps, zKey)?.get() : undefined;

    if (typeof x !== 'number' && typeof y !== 'number' && typeof z !== 'number')
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

    if (typeof z === 'number')
    {
        point.z = z;
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

    return resolveStringMap(maps, 'blendMode')?.get();
}

function collectPropValue(maps: ExportPropertyMaps, spec: ExportPropSpec): unknown
{
    if (spec.kind === 'point')
    {
        return readPoint(maps, spec.xKey, spec.yKey, spec.zKey);
    }

    if (spec.kind === 'number')
    {
        return resolveNumberMap(maps, spec.key)?.get();
    }

    if (spec.kind === 'boolean')
    {
        return resolveBooleanMap(maps, spec.key)?.get();
    }

    if (spec.kind === 'fill')
    {
        return collectFillExportValue(maps);
    }

    if (spec.key === 'blendMode')
    {
        return collectBlendModeExportValue(maps);
    }

    return resolveStringMap(maps, spec.key)?.get();
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

        if (fillExport.fillGradientType !== undefined)
        {
            scratch.props.fillGradientType = fillExport.fillGradientType;
        }

        return;
    }

    if (path === 'fillGradientType')
    {
        if (value === 'horizontal')
        {
            scratch.props.fillGradientType = 1;
        }
        else if (value === 'vertical')
        {
            scratch.props.fillGradientType = 0;
        }
        else if (typeof value === 'number')
        {
            scratch.props.fillGradientType = value;
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

function isPlainExportObject(value: unknown): value is Record<string, unknown>
{
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeExportLeafIntoObject(target: Record<string, unknown>, value: unknown)
{
    if (typeof value === 'boolean')
    {
        target.enabled = value;

        return;
    }

    target.value = value;
}

function assignNestedExportValue(
    root: Record<string, unknown>,
    path: string,
    value: unknown,
)
{
    const parts = path.split('.');
    let cursor = root;

    for (let i = 0; i < parts.length - 1; i++)
    {
        const key = parts[i];
        const existing = cursor[key];

        if (!isPlainExportObject(existing))
        {
            const next: Record<string, unknown> = {};

            if (existing !== undefined)
            {
                mergeExportLeafIntoObject(next, existing);
            }

            cursor[key] = next;
        }

        cursor = cursor[key] as Record<string, unknown>;
    }

    const leafKey = parts[parts.length - 1];
    const existingLeaf = cursor[leafKey];

    if (isPlainExportObject(existingLeaf) && !isPlainExportObject(value))
    {
        mergeExportLeafIntoObject(existingLeaf, value);

        return;
    }

    cursor[leafKey] = value;
}

function writeExportProp(
    payload: Record<string, unknown>,
    styleScratch: StyleExportScratch,
    id: ExportPropId,
    value: unknown,
): boolean
{
    if (isStyleExportId(id))
    {
        collectStyleExportProp(styleScratch, id, value);

        return true;
    }

    assignNestedExportValue(payload, id, value);

    return false;
}

function finalizeStyleExport(
    payload: Record<string, unknown>,
    styleScratch: StyleExportScratch,
    hasStyle: boolean,
)
{
    if (!hasStyle)
    {
        return;
    }

    const style = buildStyleExportObject(styleScratch, exportUsesPixi8());

    if (style)
    {
        payload.style = style;
    }
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

        if (writeExportProp(payload, styleScratch, spec.id, value))
        {
            hasStyle = true;
        }
    }

    finalizeStyleExport(payload, styleScratch, hasStyle);

    return payload;
}

export function exportSelectionKey(sectionId: PropertyExportSectionId, propId: ExportPropId): string
{
    return `${sectionId}\0${propId}`;
}

export function buildNodeExportPayload(
    maps: ExportPropertyMaps,
    selectedIds: ReadonlySet<string> | 'all',
): Record<string, unknown>
{
    const payload: Record<string, unknown> = {};
    const styleScratch = createStyleExportScratch();
    let hasStyle = false;

    for (const sectionId of PROPERTY_SECTION_IDS)
    {
        for (const spec of availableExportPropsForSection(sectionId, maps))
        {
            if (selectedIds !== 'all' && !selectedIds.has(exportSelectionKey(sectionId, spec.id)))
            {
                continue;
            }

            const value = collectPropValue(maps, spec);

            if (value === undefined)
            {
                continue;
            }

            if (writeExportProp(payload, styleScratch, spec.id, value))
            {
                hasStyle = true;
            }
        }
    }

    finalizeStyleExport(payload, styleScratch, hasStyle);

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
