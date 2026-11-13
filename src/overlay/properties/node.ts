import { isNode3D } from '../../page-ops/node-3d';
import { isNodeAlive, type PageGlobals, type PixiNode, type PixiPoint } from '../../page-ops/pixi-node';
import { classifyNode } from '../../page-ops/props-3d';
import { isParticleNode } from '../../page-ops/root';
import {
    readEffectiveEulerRadians,
    setEulerAxisRadians,
} from '../../page-ops/rotation-3d';
import { nodeHasTexture, nodeTextureName, setNodeTextureByName } from '../../page-ops/texture';
import { isPixi8 } from '../../page-ops/types';
import { isHideBlocked } from '../../page-ops/visibility';
import { colorToString, parseColorString } from '../text/colors';
import {
    directBoolean,
    directNumber,
    directString,
    type PropertyMapping,
    takeMaps,
} from './map-helpers';
import { appendThreeDPropertyMaps } from './maps-3d';
import { shouldMapProp } from './prop-policy';

import type { BooleanPropertyKey, NumberPropertyKey, StringPropertyKey } from './property-keys';

export type { BooleanPropertyKey, NumberPropertyKey, StringPropertyKey } from './property-keys';

function isPoint(value: unknown): value is PixiPoint
{
    return (
        typeof value === 'object'
        && value !== null
        && typeof (value as PixiPoint).x === 'number'
        && typeof (value as PixiPoint).y === 'number'
    );
}

function pointHasAxis(point: PixiPoint, axis: 'x' | 'y' | 'z'): boolean
{
    return typeof point[axis] === 'number';
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

    if (isParticleNode(node, win))
    {
        return [];
    }

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
    nested: 'position' | 'scale' | 'anchor' | 'pivot' | 'skew' | 'rotation' | 'angle',
    axis: 'x' | 'y' | 'z',
    key: NumberPropertyKey,
    fallbackGet?: () => number | undefined,
    fallbackSet?: (value: number) => void,
): Array<PropertyMapping<number>>
{
    const point = node[nested];

    if (isPoint(point) && pointHasAxis(point, axis))
    {
        return [
            {
                key,

                get: () => point[axis] as number,

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

function eulerAxis(
    node: PixiNode,
    nested: 'rotation' | 'angle',
    axis: 'x' | 'y' | 'z',
    key: NumberPropertyKey,
): Array<PropertyMapping<number>>
{
    if (!isNode3D(node))
    {
        return pointAxis(node, nested, axis, key);
    }

    const point = node[nested];

    if (!isPoint(point) || !pointHasAxis(point, axis))
    {
        return [];
    }

    const asDegrees = nested === 'angle';

    return [
        {
            key,

            get: () =>
            {
                const euler = readEffectiveEulerRadians(node);

                if (!euler)
                {
                    return point[axis] as number;
                }

                const radians = euler[axis];

                return asDegrees ? radians * (180 / Math.PI) : radians;
            },

            set: (value) =>
            {
                const radians = asDegrees ? value * (Math.PI / 180) : value;

                if (!setEulerAxisRadians(node, axis, radians))
                {
                    point[axis] = value;
                }
            },
        },
    ];
}

function originAxis(node: PixiNode, axis: 'x' | 'y' | 'z', key: NumberPropertyKey): Array<PropertyMapping<number>>
{
    const origin = node._origin;

    if (!isPoint(origin) || !pointHasAxis(origin, axis))
    {
        return [];
    }

    return [
        {
            key,

            get: () => origin[axis] as number,

            set: (value) =>
            {
                origin[axis] = value;
            },
        },
    ];
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

    const kind = classifyNode(node);
    const allow = (key: string) => shouldMapProp(kind, key, node);

    const numbers: Array<PropertyMapping<number>> = [];
    const booleans: Array<PropertyMapping<boolean>> = [];
    const strings: Array<PropertyMapping<string>> = [];

    strings.push(...takeMaps(allow, identityStringMaps(node)));

    if (allow('texture') && nodeHasTexture(node))
    {
        strings.push({
            key: 'texture',

            get: () => nodeTextureName(node),

            set: (value) =>
            {
                setNodeTextureByName(node, value);
            },
        });
    }

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
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
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
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
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
                node,
                'position',
                'z',
                'position.z',
                () => node.z,
                (value) =>
                {
                    node.z = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'width',
                () => node.width,
                (value) =>
                {
                    node.width = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'height',
                () => node.height,
                (value) =>
                {
                    node.height = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'depth',
                () => node.depth,
                (value) =>
                {
                    node.depth = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'rotation',
                () => (typeof node.rotation === 'number' ? node.rotation : undefined),
                (value) =>
                {
                    node.rotation = value;
                },
            ),
        ),
    );

    numbers.push(...takeMaps(allow, eulerAxis(node, 'rotation', 'x', 'rotation.x')));
    numbers.push(...takeMaps(allow, eulerAxis(node, 'rotation', 'y', 'rotation.y')));
    numbers.push(...takeMaps(allow, eulerAxis(node, 'rotation', 'z', 'rotation.z')));

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'angle',
                () => (typeof node.angle === 'number' ? node.angle : undefined),
                (value) =>
                {
                    node.angle = value;
                },
            ),
        ),
    );

    numbers.push(...takeMaps(allow, eulerAxis(node, 'angle', 'x', 'angle.x')));
    numbers.push(...takeMaps(allow, eulerAxis(node, 'angle', 'y', 'angle.y')));
    numbers.push(...takeMaps(allow, eulerAxis(node, 'angle', 'z', 'angle.z')));

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
                node,
                'scale',
                'x',
                'scale.x',
                () => node.scaleX,
                (value) =>
                {
                    node.scaleX = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
                node,
                'scale',
                'y',
                'scale.y',
                () => node.scaleY,
                (value) =>
                {
                    node.scaleY = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
                node,
                'scale',
                'z',
                'scale.z',
                () => node.scaleZ,
                (value) =>
                {
                    node.scaleZ = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
                node,
                'anchor',
                'x',
                'anchor.x',
                () => node.anchorX,
                (value) =>
                {
                    node.anchorX = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            pointAxis(
                node,
                'anchor',
                'y',
                'anchor.y',
                () => node.anchorY,
                (value) =>
                {
                    node.anchorY = value;
                },
            ),
        ),
    );

    numbers.push(...takeMaps(allow, pointAxis(node, 'pivot', 'x', 'pivot.x')));
    numbers.push(...takeMaps(allow, pointAxis(node, 'pivot', 'y', 'pivot.y')));
    numbers.push(...takeMaps(allow, originAxis(node, 'x', 'origin.x')));
    numbers.push(...takeMaps(allow, originAxis(node, 'y', 'origin.y')));
    numbers.push(...takeMaps(allow, originAxis(node, 'z', 'origin.z')));
    numbers.push(...takeMaps(allow, pointAxis(node, 'skew', 'x', 'skew.x')));
    numbers.push(...takeMaps(allow, pointAxis(node, 'skew', 'y', 'skew.y')));

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'alpha',
                () => node.alpha,
                (value) =>
                {
                    node.alpha = value;
                },
            ),
        ),
    );

    if (allow('tint') && colorToString(node.tint) !== undefined)
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

    if (allow('visible'))
    {
        booleans.push(
            ...directBoolean(
                'visible',
                () => node.visible,
                (value) =>
                {
                    if (!value && isHideBlocked(node))
                    {
                        return;
                    }

                    node.visible = value;
                },
            ),
        );
    }

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'sortableChildren',
                () => node.sortableChildren,
                (value) =>
                {
                    node.sortableChildren = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'zIndex',
                () => node.zIndex,
                (value) =>
                {
                    node.zIndex = value;
                },
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'cullable',
                () => node.cullable,
                (value) =>
                {
                    node.cullable = value;
                },
            ),
        ),
    );

    strings.push(...takeMaps(allow, blendModeMaps(node)));

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'interactiveChildren',
                () => node.interactiveChildren,
                (value) =>
                {
                    node.interactiveChildren = value;
                },
            ),
        ),
    );

    if (typeof node.eventMode === 'string')
    {
        strings.push(
            ...takeMaps(
                allow,
                directString(
                    'eventMode',
                    () => node.eventMode,
                    (value) =>
                    {
                        node.eventMode = value;
                    },
                ),
            ),
        );

        if (allow('cursor'))
        {
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
    }
    else
    {
        booleans.push(
            ...takeMaps(
                allow,
                directBoolean(
                    'interactive',
                    () => node.interactive,
                    (value) =>
                    {
                        node.interactive = value;
                    },
                ),
            ),
        );

        booleans.push(
            ...takeMaps(
                allow,
                directBoolean(
                    'buttonMode',
                    () => node.buttonMode,
                    (value) =>
                    {
                        node.buttonMode = value;
                    },
                ),
            ),
        );
    }

    appendThreeDPropertyMaps(node, allow, numbers, booleans, strings);

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
