import {
    isHemisphereEnv,
    readFog,
    readHemisphereEnv,
    readView3D,
} from '../../../page-ops/props-3d';
import { colorToString, parseColorString } from '../../text/colors';
import { type AppendMapsContext, directBoolean, directNumber, directString, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';

const DEFAULT_FOG = {
    type    : 'linear',
    color   : 0xcccccc,
    near    : 10,
    far     : 50,
    density : 0.02,
};

const DEFAULT_BACKGROUND = 0x1a1a2e;
const CULL_MODES = new Set(['off', 'cpu', 'gpu']);

export function appendView3DMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const view = readView3D(node);

    if (!view)
    {
        return;
    }

    const { allow, numbers, booleans, strings } = ctx;

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'view3d.exposure',
                () => view.exposure,
                (value) =>
                {
                    view.exposure = value;
                },
            ),
        ),
    );

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'view3d.toneMapping',
                () => view.toneMapping,
                (value) =>
                {
                    view.toneMapping = value;
                },
            ),
        ),
    );

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'view3d.shadowQuality',
                () => view.shadowQuality,
                (value) =>
                {
                    view.shadowQuality = value;
                },
            ),
        ),
    );

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'view3d.shadowFilter',
                () => view.shadowFilter,
                (value) =>
                {
                    view.shadowFilter = value;
                },
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'view3d.autoResize',
                () => view.autoResize,
                (value) =>
                {
                    view.autoResize = value;
                },
            ),
        ),
    );

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'view3d.cull',
                () => view.cull,
                (value) =>
                {
                    if (CULL_MODES.has(value))
                    {
                        view.cull = value;
                    }
                },
            ),
        ),
    );

    if (allow('view3d.resolutionInherit'))
    {
        booleans.push({
            key: 'view3d.resolutionInherit',

            get: () => view.resolution === 'inherit',

            set: (value) =>
            {
                view.resolution = value ? 'inherit' : 1;
            },
        });
    }

    if (typeof view.resolution === 'number')
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'view3d.resolution',
                    () => view.resolution as number,
                    (value) =>
                    {
                        view.resolution = value;
                    },
                ),
            ),
        );
    }

    if (allow('view3d.background'))
    {
        booleans.push({
            key: 'view3d.background',

            get: () => view.background !== undefined && view.background !== null,

            set: (value) =>
            {
                if (value)
                {
                    if (view.background === undefined || view.background === null)
                    {
                        view.background = DEFAULT_BACKGROUND;
                    }

                    return;
                }

                view.background = null;
            },
        });
    }

    const background = view.background;

    if (background !== undefined && background !== null)
    {
        if (isHemisphereEnv(background))
        {
            if (allow('view3d.background.skyColor') && colorToString(background.skyColor) !== undefined)
            {
                strings.push({
                    key: 'view3d.background.skyColor',

                    get: () => colorToString(background.skyColor),

                    set: (value) =>
                    {
                        try
                        {
                            background.skyColor = parseColorString(value);
                        }
                        catch
                        {
                            void 0;
                        }
                    },
                });
            }

            if (allow('view3d.background.groundColor') && colorToString(background.groundColor) !== undefined)
            {
                strings.push({
                    key: 'view3d.background.groundColor',

                    get: () => colorToString(background.groundColor),

                    set: (value) =>
                    {
                        try
                        {
                            background.groundColor = parseColorString(value);
                        }
                        catch
                        {
                            void 0;
                        }
                    },
                });
            }
        }
        else if (allow('view3d.background.color') && colorToString(background) !== undefined)
        {
            strings.push({
                key: 'view3d.background.color',

                get: () => colorToString(background) ?? colorToString(DEFAULT_BACKGROUND),

                set: (value) =>
                {
                    try
                    {
                        view.background = parseColorString(value);
                    }
                    catch
                    {
                        void 0;
                    }
                },
            });
        }
    }

    if (allow('view3d.fog'))
    {
        booleans.push({
            key: 'view3d.fog',

            get: () => view.fog !== undefined && view.fog !== null,

            set: (value) =>
            {
                if (value)
                {
                    if (!view.fog)
                    {
                        view.fog = { ...DEFAULT_FOG };
                    }

                    return;
                }

                view.fog = null;
            },
        });
    }

    if (readFog(node))
    {
        if (allow('view3d.fog.type'))
        {
            strings.push({
                key: 'view3d.fog.type',

                get: () => view.fog?.type ?? DEFAULT_FOG.type,

                set: (value) =>
                {
                    const current = view.fog;

                    if (!current)
                    {
                        return;
                    }

                    view.fog = {
                        type    : value,
                        color   : current.color,
                        near    : current.near,
                        far     : current.far,
                        density : current.density,
                    };
                },
            });
        }

        if (allow('view3d.fog.color'))
        {
            strings.push({
                key: 'view3d.fog.color',

                get: () => colorToString(view.fog?.color) ?? colorToString(DEFAULT_FOG.color),

                set: (value) =>
                {
                    if (!view.fog)
                    {
                        return;
                    }

                    try
                    {
                        view.fog.color = parseColorString(value);
                    }
                    catch
                    {
                        void 0;
                    }
                },
            });
        }

        if (allow('view3d.fog.near'))
        {
            numbers.push({
                key : 'view3d.fog.near',
                get : () =>
                {
                    const near = view.fog?.near;

                    return typeof near === 'number' ? near : DEFAULT_FOG.near;
                },
                set: (value) =>
                {
                    if (view.fog)
                    {
                        view.fog.near = value;
                    }
                },
            });
        }

        if (allow('view3d.fog.far'))
        {
            numbers.push({
                key : 'view3d.fog.far',
                get : () =>
                {
                    const far = view.fog?.far;

                    return typeof far === 'number' ? far : DEFAULT_FOG.far;
                },
                set: (value) =>
                {
                    if (view.fog)
                    {
                        view.fog.far = value;
                    }
                },
            });
        }

        if (allow('view3d.fog.density'))
        {
            numbers.push({
                key : 'view3d.fog.density',
                get : () =>
                {
                    const density = view.fog?.density;

                    return typeof density === 'number' ? density : DEFAULT_FOG.density;
                },
                set: (value) =>
                {
                    if (view.fog)
                    {
                        view.fog.density = value;
                    }
                },
            });
        }
    }

    const env = readHemisphereEnv(node);

    if (!env)
    {
        return;
    }

    if (allow('view3d.env.skyColor') && colorToString(env.skyColor) !== undefined)
    {
        strings.push({
            key: 'view3d.env.skyColor',

            get: () => colorToString(env.skyColor),

            set: (value) =>
            {
                try
                {
                    env.skyColor = parseColorString(value);
                }
                catch
                {
                    void 0;
                }
            },
        });
    }

    if (allow('view3d.env.groundColor') && colorToString(env.groundColor) !== undefined)
    {
        strings.push({
            key: 'view3d.env.groundColor',

            get: () => colorToString(env.groundColor),

            set: (value) =>
            {
                try
                {
                    env.groundColor = parseColorString(value);
                }
                catch
                {
                    void 0;
                }
            },
        });
    }

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'view3d.env.intensity',
                () => env.intensity,
                (value) =>
                {
                    env.intensity = value;
                },
            ),
        ),
    );
}
