import { isShadowCastingLight3D, readLight3D } from '../../../page-ops/props-3d';
import { type AppendMapsContext } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';

type LightShadowLike = {
    bias?: number;
    normalBias?: number;
    cascades?: 1 | 2 | 3 | 4;
    maxDistance?: number;
    lambda?: number;
    update?: number | Array<number> | 'manual';
};

type LightWithShadow = {
    shadow?: LightShadowLike;
};

const CASCADE_VALUES = new Set(['1', '2', '3', '4']);
const UPDATE_VALUES = new Set(['1', '2', '4', '8', 'manual']);

const DEFAULT_BIAS = 0.001;
const DEFAULT_NORMAL_BIAS = 0.15;
const DEFAULT_MAX_DISTANCE = 50;
const DEFAULT_LAMBDA = 0.5;

function readShadow(node: PixiNode): LightShadowLike | null
{
    if (!isShadowCastingLight3D(node))
    {
        return null;
    }

    const light = readLight3D(node) as LightWithShadow | null;
    const shadow = light?.shadow;

    if (!shadow || typeof shadow !== 'object')
    {
        return null;
    }

    return shadow;
}

export function appendShadowMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const shadow = readShadow(node);

    if (!shadow)
    {
        return;
    }

    const { allow, numbers, strings } = ctx;

    if (allow('light.shadow.bias'))
    {
        numbers.push({
            key: 'light.shadow.bias',

            get: () => (typeof shadow.bias === 'number' ? shadow.bias : DEFAULT_BIAS),

            set: (value) =>
            {
                shadow.bias = value;
            },
        });
    }

    if (allow('light.shadow.normalBias'))
    {
        numbers.push({
            key: 'light.shadow.normalBias',

            get: () => (typeof shadow.normalBias === 'number' ? shadow.normalBias : DEFAULT_NORMAL_BIAS),

            set: (value) =>
            {
                shadow.normalBias = value;
            },
        });
    }

    if (allow('light.shadow.cascades'))
    {
        strings.push({
            key: 'light.shadow.cascades',

            get: () =>
            {
                const cascades = shadow.cascades;

                return cascades === undefined ? 'off' : String(cascades);
            },

            set: (value) =>
            {
                if (value === 'off')
                {
                    shadow.cascades = undefined;

                    return;
                }

                if (CASCADE_VALUES.has(value))
                {
                    shadow.cascades = Number(value) as 1 | 2 | 3 | 4;
                }
            },
        });
    }

    if (shadow.cascades !== undefined)
    {
        if (allow('light.shadow.maxDistance'))
        {
            numbers.push({
                key: 'light.shadow.maxDistance',

                get: () => (typeof shadow.maxDistance === 'number'
                    ? shadow.maxDistance
                    : DEFAULT_MAX_DISTANCE),

                set: (value) =>
                {
                    shadow.maxDistance = value;
                },
            });
        }

        if (allow('light.shadow.lambda'))
        {
            numbers.push({
                key: 'light.shadow.lambda',

                get: () => (typeof shadow.lambda === 'number' ? shadow.lambda : DEFAULT_LAMBDA),

                set: (value) =>
                {
                    shadow.lambda = value;
                },
            });
        }
    }

    if (allow('light.shadow.update') && !Array.isArray(shadow.update))
    {
        strings.push({
            key: 'light.shadow.update',

            get: () => String(shadow.update ?? 1),

            set: (value) =>
            {
                if (!UPDATE_VALUES.has(value))
                {
                    return;
                }

                shadow.update = value === 'manual' ? 'manual' : Number(value);
            },
        });
    }
}
