import { isNodeAlive, type PageGlobals, type PixiNode, type PixiPoint } from '../../page-ops/pixi-node';
import { isPixi8 } from '../../page-ops/types';
import { colorToString, parseColorString } from '../text/colors';

type PropertyKey =
    | 'position.x'
    | 'position.y'
    | 'width'
    | 'height'
    | 'rotation'
    | 'angle'
    | 'scale.x'
    | 'scale.y'
    | 'anchor.x'
    | 'anchor.y'
    | 'pivot.x'
    | 'pivot.y'
    | 'skew.x'
    | 'skew.y'
    | 'alpha'
    | 'visible'
    | 'sortableChildren'
    | 'zIndex'
    | 'cullable'
    | 'blendMode'
    | 'eventMode'
    | 'cursor'
    | 'interactive'
    | 'buttonMode'
    | 'interactiveChildren'
    | 'label'
    | 'name'
    | 'tint';

export type BooleanPropertyKey =
    | 'visible'
    | 'sortableChildren'
    | 'cullable'
    | 'interactive'
    | 'buttonMode'
    | 'interactiveChildren';

export type StringPropertyKey =
    | 'eventMode'
    | 'cursor'
    | 'blendMode'
    | 'label'
    | 'name'
    | 'tint';

export type NumberPropertyKey = Exclude<
    PropertyKey,
    BooleanPropertyKey | StringPropertyKey
>;

type PropertyMapping<T> = {
    key: PropertyKey;
    get: () => T | undefined;
    set: (value: T) => void;
};

function isPoint(value: unknown): value is PixiPoint
{
    return (
        typeof value === 'object'
        && value !== null
        && typeof (value as PixiPoint).x === 'number'
        && typeof (value as PixiPoint).y === 'number'
    );
}

function directNumber(
    key: NumberPropertyKey,
    get: () => number | undefined,
    set: (value: number) => void,
): Array<PropertyMapping<number>>
{
    if (typeof get() !== 'number')
    {
        return [];
    }

    return [{ key, get, set }];
}

function directBoolean(
    key: BooleanPropertyKey,
    get: () => boolean | undefined,
    set: (value: boolean) => void,
): Array<PropertyMapping<boolean>>
{
    if (typeof get() !== 'boolean')
    {
        return [];
    }

    return [{ key, get, set }];
}

function directString(
    key: StringPropertyKey,
    get: () => string | undefined,
    set: (value: string) => void,
): Array<PropertyMapping<string>>
{
    if (typeof get() !== 'string')
    {
        return [];
    }

    return [{ key, get, set }];
}

const BLEND_MODE_FROM_V7: Array<string | undefined> = [
    'normal',
    'add',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
    'normal-npm',
    'add-npm',
    'screen-npm',
    'none',
    'src-in',
    'src-out',
    'src-atop',
    'dst-over',
    'dst-in',
    'erase',
    'dst-atop',
    'subtract',
    'xor',
];

const BLEND_MODE_TO_V7: Record<string, number> = {
    normal        : 0,
    'src-over'    : 0,
    add           : 1,
    multiply      : 2,
    screen        : 3,
    overlay       : 4,
    darken        : 5,
    lighten       : 6,
    'color-dodge' : 7,
    'color-burn'  : 8,
    'hard-light'  : 9,
    'soft-light'  : 10,
    difference    : 11,
    exclusion     : 12,
    hue           : 13,
    saturation    : 14,
    color         : 15,
    luminosity    : 16,
    'normal-npm'  : 17,
    'add-npm'     : 18,
    'screen-npm'  : 19,
    none          : 20,
    'src-in'      : 21,
    'src-out'     : 22,
    'src-atop'    : 23,
    'dst-over'    : 24,
    'dst-in'      : 25,
    erase         : 26,
    'dst-out'     : 26,
    'dst-atop'    : 27,
    subtract      : 28,
    xor           : 29,
};

function readIdentityString(value: unknown): string
{
    if (typeof value === 'string')
    {
        return value;
    }

    if (value === null || value === undefined)
    {
        return '';
    }

    return String(value);
}

function identityStringMaps(node: PixiNode): Array<PropertyMapping<string>>
{
    const win = globalThis as PageGlobals;
    const useLabel = isPixi8(node, win);

    if (useLabel)
    {
        return [
            {
                key: 'label',

                get: () => readIdentityString(node.label),

                set: (value) =>
                {
                    node.label = value;
                },
            },
        ];
    }

    return [
        {
            key: 'name',

            get: () => readIdentityString(node.name),

            set: (value) =>
            {
                node.name = value;
            },
        },
    ];
}

function blendModeMaps(node: PixiNode): Array<PropertyMapping<string>>
{
    const current = node.blendMode;

    if (typeof current === 'string')
    {
        return [
            {
                key: 'blendMode',

                get: () =>
                {
                    const value = node.blendMode;

                    return typeof value === 'string' ? value : undefined;
                },

                set: (value) =>
                {
                    node.blendMode = value;
                },
            },
        ];
    }

    if (typeof current === 'number')
    {
        return [
            {
                key: 'blendMode',

                get: () =>
                {
                    const value = node.blendMode;

                    if (typeof value !== 'number')
                    {
                        return undefined;
                    }

                    if (value >= 0 && value < BLEND_MODE_FROM_V7.length)
                    {
                        return BLEND_MODE_FROM_V7[value] ?? String(value);
                    }

                    return String(value);
                },

                set: (value) =>
                {
                    const mapped = BLEND_MODE_TO_V7[value];

                    if (typeof mapped === 'number')
                    {
                        node.blendMode = mapped;
                    }
                },
            },
        ];
    }

    return [];
}

function pointAxis(
    node: PixiNode,
    nested: 'position' | 'scale' | 'anchor' | 'pivot' | 'skew',
    axis: 'x' | 'y',
    key: NumberPropertyKey,
    fallbackGet?: () => number | undefined,
    fallbackSet?: (value: number) => void,
): Array<PropertyMapping<number>>
{
    const point = node[nested];

    if (isPoint(point))
    {
        return [
            {
                key,

                get: () => point[axis],

                set: (value) =>
                {
                    point[axis] = value;
                },
            },
        ];
    }

    if (fallbackGet && fallbackSet && typeof fallbackGet() === 'number')
    {
        return [
            {
                key,
                get : fallbackGet,
                set : fallbackSet,
            },
        ];
    }

    return [];
}

export type NodePropertyMaps = {
    numbers: Array<PropertyMapping<number>>;
    booleans: Array<PropertyMapping<boolean>>;
    strings: Array<PropertyMapping<string>>;
};

export function mapsForNode(node: PixiNode | null | undefined): NodePropertyMaps
{
    if (!isNodeAlive(node))
    {
        return { numbers: [], booleans: [], strings: [] };
    }

    const numbers: Array<PropertyMapping<number>> = [];
    const booleans: Array<PropertyMapping<boolean>> = [];
    const strings: Array<PropertyMapping<string>> = [];

    strings.push(...identityStringMaps(node));

    numbers.push(
        ...pointAxis(
            node,
            'position',
            'x',
            'position.x',
            () => node.x,
            (value) =>
            {
                node.x = value;
            },
        ),
    );

    numbers.push(
        ...pointAxis(
            node,
            'position',
            'y',
            'position.y',
            () => node.y,
            (value) =>
            {
                node.y = value;
            },
        ),
    );

    numbers.push(
        ...directNumber(
            'width',
            () => node.width,
            (value) =>
            {
                node.width = value;
            },
        ),
    );

    numbers.push(
        ...directNumber(
            'height',
            () => node.height,
            (value) =>
            {
                node.height = value;
            },
        ),
    );

    numbers.push(
        ...directNumber(
            'rotation',
            () => node.rotation,
            (value) =>
            {
                node.rotation = value;
            },
        ),
    );

    numbers.push(
        ...directNumber(
            'angle',
            () => node.angle,
            (value) =>
            {
                node.angle = value;
            },
        ),
    );

    numbers.push(...pointAxis(node, 'scale', 'x', 'scale.x'));
    numbers.push(...pointAxis(node, 'scale', 'y', 'scale.y'));
    numbers.push(...pointAxis(node, 'anchor', 'x', 'anchor.x'));
    numbers.push(...pointAxis(node, 'anchor', 'y', 'anchor.y'));
    numbers.push(...pointAxis(node, 'pivot', 'x', 'pivot.x'));
    numbers.push(...pointAxis(node, 'pivot', 'y', 'pivot.y'));
    numbers.push(...pointAxis(node, 'skew', 'x', 'skew.x'));
    numbers.push(...pointAxis(node, 'skew', 'y', 'skew.y'));

    numbers.push(
        ...directNumber(
            'alpha',
            () => node.alpha,
            (value) =>
            {
                node.alpha = value;
            },
        ),
    );

    if (colorToString(node.tint) !== undefined)
    {
        strings.push({
            key: 'tint',

            get: () => colorToString(node.tint),

            set: (value) =>
            {
                try
                {
                    node.tint = parseColorString(value);
                }
                catch
                {
                    void 0;
                }
            },
        });
    }

    booleans.push(
        ...directBoolean(
            'visible',
            () => node.visible,
            (value) =>
            {
                node.visible = value;
            },
        ),
    );

    booleans.push(
        ...directBoolean(
            'sortableChildren',
            () => node.sortableChildren,
            (value) =>
            {
                node.sortableChildren = value;
            },
        ),
    );

    numbers.push(
        ...directNumber(
            'zIndex',
            () => node.zIndex,
            (value) =>
            {
                node.zIndex = value;
            },
        ),
    );

    booleans.push(
        ...directBoolean(
            'cullable',
            () => node.cullable,
            (value) =>
            {
                node.cullable = value;
            },
        ),
    );

    strings.push(...blendModeMaps(node));

    booleans.push(
        ...directBoolean(
            'interactiveChildren',
            () => node.interactiveChildren,
            (value) =>
            {
                node.interactiveChildren = value;
            },
        ),
    );

    if (typeof node.eventMode === 'string')
    {
        strings.push(
            ...directString(
                'eventMode',
                () => node.eventMode,
                (value) =>
                {
                    node.eventMode = value;
                },
            ),
        );

        strings.push({
            key: 'cursor',

            get: () =>
            {
                const cursor = node.cursor;

                return typeof cursor === 'string' ? cursor : '';
            },

            set: (value) =>
            {
                node.cursor = value === '' ? undefined : value;
            },
        });
    }
    else
    {
        booleans.push(
            ...directBoolean(
                'interactive',
                () => node.interactive,
                (value) =>
                {
                    node.interactive = value;
                },
            ),
        );

        booleans.push(
            ...directBoolean(
                'buttonMode',
                () => node.buttonMode,
                (value) =>
                {
                    node.buttonMode = value;
                },
            ),
        );
    }

    return { numbers, booleans, strings };
}

export function findNumberMap(maps: NodePropertyMaps, key: NumberPropertyKey): PropertyMapping<number> | undefined
{
    return maps.numbers.find((entry) => entry.key === key);
}

export function findBooleanMap(maps: NodePropertyMaps, key: BooleanPropertyKey): PropertyMapping<boolean> | undefined
{
    return maps.booleans.find((entry) => entry.key === key);
}

export function findStringMap(maps: NodePropertyMaps, key: StringPropertyKey): PropertyMapping<string> | undefined
{
    return maps.strings.find((entry) => entry.key === key);
}
