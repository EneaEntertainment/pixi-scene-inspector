import type {
    BooleanFieldSpec,
    ColorFieldSpec,
    FillStopsFieldSpec,
    NumberFieldSpec,
    SelectFieldSpec,
    TextFieldSpec,
    TextureFieldSpec,
} from '../fields';
import type { NumberPropertyKey } from './property-keys';

export type PropertyExportSectionId =
    | 'identity'
    | 'animation'
    | 'texture'
    | 'transform'
    | 'mesh'
    | 'light'
    | 'lightShadow'
    | 'camera'
    | 'orbit'
    | 'viewViewport'
    | 'viewEnvironment'
    | 'viewShadows'
    | 'viewFog'
    | 'viewLook'
    | 'material'
    | 'materialTextures'
    | 'visibility'
    | 'rendering'
    | 'interactivity'
    | 'textContent'
    | 'textFont'
    | 'textFill'
    | 'textLayout'
    | 'textStroke'
    | 'textDropShadow';

export type SectionFieldSpec =
    | ({ kind: 'number' } & NumberFieldSpec)
    | ({ kind: 'boolean' } & BooleanFieldSpec)
    | ({ kind: 'select' } & SelectFieldSpec)
    | ({ kind: 'text' } & TextFieldSpec)
    | ({ kind: 'color' } & ColorFieldSpec)
    | ({ kind: 'texture' } & TextureFieldSpec)
    | ({ kind: 'fillStops' } & FillStopsFieldSpec);

export type SectionSpec = {
    id: PropertyExportSectionId;
    title: string;
    fields: Array<SectionFieldSpec>;
};

export type PointCatalogFieldSpec = {
    kind: 'point';
    id: string;
    xKey: NumberPropertyKey;
    yKey: NumberPropertyKey;
    zKey?: NumberPropertyKey;
    label: string;
    step: number;
    dragAccel?: number;
    min?: number;
    max?: number;
};

export type CatalogFieldSpec = SectionFieldSpec | PointCatalogFieldSpec;

export type CatalogSectionSpec = {
    id: PropertyExportSectionId;
    title: string;
    fields: Array<CatalogFieldSpec>;
};
