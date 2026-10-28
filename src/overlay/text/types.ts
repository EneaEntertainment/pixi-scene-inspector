type TextPropertyKey =
    | 'text'
    | 'style.fontFamily'
    | 'style.fontName'
    | 'style.fontSize'
    | 'style.fontWeight'
    | 'style.fontStyle'
    | 'style.fontVariant'
    | 'style.fill'
    | 'style.tint'
    | 'style.align'
    | 'style.letterSpacing'
    | 'style.maxWidth'
    | 'style.lineHeight'
    | 'style.leading'
    | 'style.padding'
    | 'style.wordWrap'
    | 'style.wordWrapWidth'
    | 'style.breakWords'
    | 'style.whiteSpace'
    | 'style.textBaseline'
    | 'style.trim'
    | 'style.strokeColor'
    | 'style.strokeWidth'
    | 'style.strokeJoin'
    | 'style.strokeMiterLimit'
    | 'style.dropShadow'
    | 'style.dropShadow.alpha'
    | 'style.dropShadow.angle'
    | 'style.dropShadow.blur'
    | 'style.dropShadow.color'
    | 'style.dropShadow.distance';

export type TextBooleanPropertyKey =
    | 'style.wordWrap'
    | 'style.breakWords'
    | 'style.trim'
    | 'style.dropShadow';

export type TextStringPropertyKey =
    | 'text'
    | 'style.fontFamily'
    | 'style.fontName'
    | 'style.fontWeight'
    | 'style.fontStyle'
    | 'style.fontVariant'
    | 'style.tint'
    | 'style.align'
    | 'style.whiteSpace'
    | 'style.textBaseline'
    | 'style.strokeColor'
    | 'style.strokeJoin'
    | 'style.dropShadow.color';

export type TextFillPropertyKey = 'style.fill';

export type TextNumberPropertyKey = Exclude<
    TextPropertyKey,
    TextBooleanPropertyKey | TextStringPropertyKey | TextFillPropertyKey
>;

export type FillColorStop = {
    color: string;
    offset: number;
};

export type PropertyMapping<T> = {
    key: TextPropertyKey;
    get: () => T | undefined;
    set: (value: T) => void;
};

export type FillStopsMapping = {
    key: TextFillPropertyKey;
    get: () => Array<FillColorStop> | undefined;
    set: (value: Array<FillColorStop>) => void;
};

export type TextPropertyMaps = {
    numbers: Array<PropertyMapping<number>>;
    booleans: Array<PropertyMapping<boolean>>;
    strings: Array<PropertyMapping<string>>;
    fillStops: FillStopsMapping | null;
};

export type StyleRecord = Record<string, unknown>;
