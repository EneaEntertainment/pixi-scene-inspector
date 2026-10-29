import {
    ALIGN_OPTIONS,
    BLEND_MODE_OPTIONS,
    CURSOR_OPTIONS,
    EVENT_MODE_OPTIONS,
    FILL_GRADIENT_TYPE_OPTIONS,
    FONT_STYLE_OPTIONS,
    FONT_VARIANT_OPTIONS,
    FONT_WEIGHT_OPTIONS,
    STROKE_JOIN_OPTIONS,
    TEXT_BASELINE_OPTIONS,
    WHITE_SPACE_OPTIONS,
} from './options';

import type {
    BooleanFieldSpec,
    ColorFieldSpec,
    FillStopsFieldSpec,
    NumberFieldSpec,
    SelectFieldSpec,
    TextFieldSpec,
} from '../fields';
import type { FieldBooleanKey, FieldNumberKey, FieldStringKey } from './keys';
import type { NumberPropertyKey } from './node';
import type { TextFillPropertyKey } from './text';

export type PropertyExportSectionId =
    | 'identity'
    | 'transform'
    | 'visibility'
    | 'rendering'
    | 'interactivity'
    | 'textContent'
    | 'textFont'
    | 'textFill'
    | 'textLayout'
    | 'textStroke'
    | 'textDropShadow';

export const PROPERTY_SECTION_IDS: Array<PropertyExportSectionId> = [
    'identity',
    'transform',
    'visibility',
    'rendering',
    'interactivity',
    'textContent',
    'textFont',
    'textFill',
    'textLayout',
    'textStroke',
    'textDropShadow',
];

export const PROPERTY_SECTION_TITLES: Record<PropertyExportSectionId, string> = {
    identity       : 'Identity',
    transform      : 'Transform',
    visibility     : 'Visibility',
    rendering      : 'Rendering',
    interactivity  : 'Interactivity',
    textContent    : 'Content',
    textFont       : 'Font',
    textFill       : 'Fill',
    textLayout     : 'Layout',
    textStroke     : 'Stroke',
    textDropShadow : 'Drop Shadow',
};

export type SectionFieldSpec =
    | ({ kind: 'number' } & NumberFieldSpec)
    | ({ kind: 'boolean' } & BooleanFieldSpec)
    | ({ kind: 'select' } & SelectFieldSpec)
    | ({ kind: 'text' } & TextFieldSpec)
    | ({ kind: 'color' } & ColorFieldSpec)
    | ({ kind: 'fillStops' } & FillStopsFieldSpec);

export type SectionSpec = {
    id: PropertyExportSectionId;
    title: string;
    fields: Array<SectionFieldSpec>;
};

type PointCatalogFieldSpec = {
    kind: 'point';
    id: string;
    xKey: NumberPropertyKey;
    yKey: NumberPropertyKey;
    label: string;
    step: number;
    dragAccel?: number;
    min?: number;
    max?: number;
};

type CatalogFieldSpec = SectionFieldSpec | PointCatalogFieldSpec;

type CatalogSectionSpec = {
    id: PropertyExportSectionId;
    title: string;
    fields: Array<CatalogFieldSpec>;
};

type ExportPropId = string;

type PointExportSpec = {
    kind: 'point';
    id: ExportPropId;
    xKey: NumberPropertyKey;
    yKey: NumberPropertyKey;
};

type NumberExportSpec = {
    kind: 'number';
    id: ExportPropId;
    key: FieldNumberKey;
};

type BooleanExportSpec = {
    kind: 'boolean';
    id: ExportPropId;
    key: FieldBooleanKey;
};

type StringExportSpec = {
    kind: 'string';
    id: ExportPropId;
    key: FieldStringKey;
};

type FillExportSpec = {
    kind: 'fill';
    id: ExportPropId;
    key: TextFillPropertyKey;
};

export type ExportPropSpec =
    | PointExportSpec
    | NumberExportSpec
    | BooleanExportSpec
    | StringExportSpec
    | FillExportSpec;

type PropertiesFormTabId = 'object' | 'text';

const OBJECT_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'identity',
        title  : 'Identity',
        fields : [
            { kind: 'text', key: 'label', label: 'label' },
            { kind: 'text', key: 'name', label: 'name' },
        ],
    },
    {
        id     : 'transform',
        title  : 'Transform',
        fields : [
            {
                kind      : 'point',
                id        : 'position',
                xKey      : 'position.x',
                yKey      : 'position.y',
                label     : 'position',
                step      : 1,
                dragAccel : 5,
            },
            { kind: 'number', key: 'width', label: 'width', step: 1, dragAccel: 2 },
            { kind: 'number', key: 'height', label: 'height', step: 1, dragAccel: 2 },
            { kind: 'number', key: 'rotation', label: 'rotation', step: 0.025, dragAccel: 0.25 },
            { kind: 'number', key: 'angle', label: 'angle', step: 1, dragAccel: 1 },
            {
                kind      : 'point',
                id        : 'scale',
                xKey      : 'scale.x',
                yKey      : 'scale.y',
                label     : 'scale',
                step      : 0.01,
                dragAccel : 0.1,
            },
            {
                kind      : 'point',
                id        : 'anchor',
                xKey      : 'anchor.x',
                yKey      : 'anchor.y',
                label     : 'anchor',
                step      : 0.1,
                dragAccel : 1,
            },
            {
                kind      : 'point',
                id        : 'pivot',
                xKey      : 'pivot.x',
                yKey      : 'pivot.y',
                label     : 'pivot',
                step      : 1,
                dragAccel : 2,
            },
            {
                kind      : 'point',
                id        : 'skew',
                xKey      : 'skew.x',
                yKey      : 'skew.y',
                label     : 'skew',
                step      : 0.005,
                dragAccel : 0.1,
            },
        ],
    },
    {
        id     : 'visibility',
        title  : 'Visibility',
        fields : [
            { kind: 'number', key: 'alpha', label: 'alpha', step: 0.05, min: 0, max: 1 },
            { kind: 'boolean', key: 'visible', label: 'visible' },
        ],
    },
    {
        id     : 'rendering',
        title  : 'Rendering',
        fields : [
            {
                kind    : 'select',
                key     : 'blendMode',
                label   : 'blendMode',
                options : BLEND_MODE_OPTIONS,
            },
            { kind: 'number', key: 'zIndex', label: 'zIndex', step: 1, dragAccel: 1 },
            { kind: 'boolean', key: 'sortableChildren', label: 'sortableChildren' },
            { kind: 'boolean', key: 'cullable', label: 'cullable' },
        ],
    },
    {
        id     : 'interactivity',
        title  : 'Interactivity',
        fields : [
            {
                kind    : 'select',
                key     : 'eventMode',
                label   : 'eventMode',
                options : EVENT_MODE_OPTIONS,
            },
            {
                kind       : 'select',
                key        : 'cursor',
                label      : 'cursor',
                options    : CURSOR_OPTIONS,
                allowEmpty : true,
            },
            { kind: 'boolean', key: 'interactive', label: 'interactive' },
            { kind: 'boolean', key: 'buttonMode', label: 'buttonMode' },
            { kind: 'boolean', key: 'interactiveChildren', label: 'interactiveChildren' },
        ],
    },
];

const TEXT_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'textContent',
        title  : 'Content',
        fields : [
            { kind: 'text', key: 'text', label: 'text' },
        ],
    },
    {
        id     : 'textFont',
        title  : 'Font',
        fields : [
            { kind: 'text', key: 'style.fontFamily', label: 'fontFamily' },
            { kind: 'text', key: 'style.fontName', label: 'fontName' },
            { kind: 'number', key: 'style.fontSize', label: 'fontSize', step: 1, dragAccel: 2 },
            {
                kind    : 'select',
                key     : 'style.fontWeight',
                label   : 'fontWeight',
                options : FONT_WEIGHT_OPTIONS,
            },
            {
                kind    : 'select',
                key     : 'style.fontStyle',
                label   : 'fontStyle',
                options : FONT_STYLE_OPTIONS,
            },
            {
                kind    : 'select',
                key     : 'style.fontVariant',
                label   : 'fontVariant',
                options : FONT_VARIANT_OPTIONS,
            },
        ],
    },
    {
        id     : 'textFill',
        title  : 'Fill',
        fields : [
            {
                kind    : 'select',
                key     : 'style.fillGradientType',
                label   : 'fillGradientType',
                options : FILL_GRADIENT_TYPE_OPTIONS,
            },
            { kind: 'fillStops', key: 'style.fill', label: 'fill' },
            { kind: 'color', key: 'style.tint', label: 'tint' },
        ],
    },
    {
        id     : 'textLayout',
        title  : 'Layout',
        fields : [
            {
                kind    : 'select',
                key     : 'style.align',
                label   : 'align',
                options : ALIGN_OPTIONS,
            },
            {
                kind      : 'number',
                key       : 'style.letterSpacing',
                label     : 'letterSpacing',
                step      : 0.5,
                dragAccel : 2,
            },
            {
                kind      : 'number',
                key       : 'style.maxWidth',
                label     : 'maxWidth',
                step      : 1,
                dragAccel : 5,
            },
            {
                kind      : 'number',
                key       : 'style.lineHeight',
                label     : 'lineHeight',
                step      : 1,
                dragAccel : 2,
            },
            {
                kind      : 'number',
                key       : 'style.leading',
                label     : 'leading',
                step      : 0.5,
                dragAccel : 2,
            },
            {
                kind      : 'number',
                key       : 'style.padding',
                label     : 'padding',
                step      : 1,
                dragAccel : 2,
            },
            { kind: 'boolean', key: 'style.wordWrap', label: 'wordWrap' },
            {
                kind      : 'number',
                key       : 'style.wordWrapWidth',
                label     : 'wordWrapWidth',
                step      : 1,
                dragAccel : 5,
            },
            { kind: 'boolean', key: 'style.breakWords', label: 'breakWords' },
            {
                kind    : 'select',
                key     : 'style.whiteSpace',
                label   : 'whiteSpace',
                options : WHITE_SPACE_OPTIONS,
            },
            {
                kind    : 'select',
                key     : 'style.textBaseline',
                label   : 'textBaseline',
                options : TEXT_BASELINE_OPTIONS,
            },
            { kind: 'boolean', key: 'style.trim', label: 'trim' },
        ],
    },
    {
        id     : 'textStroke',
        title  : 'Stroke',
        fields : [
            { kind: 'color', key: 'style.strokeColor', label: 'stroke' },
            {
                kind      : 'number',
                key       : 'style.strokeWidth',
                label     : 'strokeWidth',
                step      : 0.5,
                dragAccel : 2,
            },
            {
                kind    : 'select',
                key     : 'style.strokeJoin',
                label   : 'strokeJoin',
                options : STROKE_JOIN_OPTIONS,
            },
            {
                kind      : 'number',
                key       : 'style.strokeMiterLimit',
                label     : 'miterLimit',
                step      : 0.5,
                dragAccel : 2,
            },
        ],
    },
    {
        id     : 'textDropShadow',
        title  : 'Drop Shadow',
        fields : [
            { kind: 'boolean', key: 'style.dropShadow', label: 'dropShadow' },
            {
                kind  : 'number',
                key   : 'style.dropShadow.alpha',
                label : 'alpha',
                step  : 0.05,
                min   : 0,
                max   : 1,
            },
            {
                kind      : 'number',
                key       : 'style.dropShadow.angle',
                label     : 'angle',
                step      : 0.05,
                dragAccel : 0.5,
            },
            {
                kind      : 'number',
                key       : 'style.dropShadow.blur',
                label     : 'blur',
                step      : 0.5,
                dragAccel : 2,
            },
            { kind: 'color', key: 'style.dropShadow.color', label: 'color' },
            {
                kind      : 'number',
                key       : 'style.dropShadow.distance',
                label     : 'distance',
                step      : 0.5,
                dragAccel : 2,
            },
        ],
    },
];

function expandPointAxis(
    key: NumberPropertyKey,
    label: string,
    field: PointCatalogFieldSpec,
): SectionFieldSpec
{
    const result: { kind: 'number' } & NumberFieldSpec = {
        kind : 'number',
        key,
        label,
        step : field.step,
    };

    if (field.dragAccel !== undefined)
    {
        result.dragAccel = field.dragAccel;
    }

    if (field.min !== undefined)
    {
        result.min = field.min;
    }

    if (field.max !== undefined)
    {
        result.max = field.max;
    }

    return result;
}

function expandCatalogFieldToForm(field: CatalogFieldSpec): Array<SectionFieldSpec>
{
    if (field.kind === 'point')
    {
        return [
            expandPointAxis(field.xKey, `${field.label}.x`, field),
            expandPointAxis(field.yKey, `${field.label}.y`, field),
        ];
    }

    return [field];
}

function catalogFieldToExport(field: CatalogFieldSpec): ExportPropSpec
{
    if (field.kind === 'point')
    {
        return {
            kind : 'point',
            id   : field.id,
            xKey : field.xKey,
            yKey : field.yKey,
        };
    }

    if (field.kind === 'number')
    {
        return { kind: 'number', id: field.key, key: field.key };
    }

    if (field.kind === 'boolean')
    {
        return { kind: 'boolean', id: field.key, key: field.key };
    }

    if (field.kind === 'fillStops')
    {
        return { kind: 'fill', id: field.key, key: field.key };
    }

    return { kind: 'string', id: field.key, key: field.key };
}

function formSectionsFromCatalog(sections: Array<CatalogSectionSpec>): Array<SectionSpec>
{
    return sections.map((section) => ({
        id     : section.id,
        title  : section.title,
        fields : section.fields.flatMap(expandCatalogFieldToForm),
    }));
}

function exportPropsFromCatalog(sections: Array<CatalogSectionSpec>): Record<
    PropertyExportSectionId,
    Array<ExportPropSpec>
>
{
    const result = {} as Record<PropertyExportSectionId, Array<ExportPropSpec>>;

    for (const section of sections)
    {
        result[section.id] = section.fields.map(catalogFieldToExport);
    }

    return result;
}

export const OBJECT_FORM_SECTIONS: Array<SectionSpec> = formSectionsFromCatalog(OBJECT_CATALOG_SECTIONS);
export const TEXT_FORM_SECTIONS: Array<SectionSpec> = formSectionsFromCatalog(TEXT_CATALOG_SECTIONS);

export function formSectionsForTab(tab: PropertiesFormTabId): Array<SectionSpec>
{
    return tab === 'object' ? OBJECT_FORM_SECTIONS : TEXT_FORM_SECTIONS;
}

export const EXPORT_PROPS_BY_SECTION: Record<
    PropertyExportSectionId,
    Array<ExportPropSpec>
> = exportPropsFromCatalog([
    ...OBJECT_CATALOG_SECTIONS,
    ...TEXT_CATALOG_SECTIONS,
]);

export function exportPropsForSection(sectionId: PropertyExportSectionId): Array<ExportPropSpec>
{
    return EXPORT_PROPS_BY_SECTION[sectionId];
}
