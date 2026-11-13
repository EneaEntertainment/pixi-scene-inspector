import { readLight3D } from '../../../page-ops/props-3d';
import { colorToString, parseColorString } from '../../text/colors';
import { type AppendMapsContext, directBoolean, directNumber, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';

export function appendLightMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const light = readLight3D(node);

    if (!light)
    {
        return;
    }

    const { allow, numbers, booleans, strings } = ctx;

    if (allow('light.color') && colorToString(light.color) !== undefined)
    {
        strings.push({
            key: 'light.color',

            get: () => colorToString(light.color),

            set: (value) =>
            {
                try
                {
                    light.color = parseColorString(value);
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
                'light.intensity',
                () => light.intensity,
                (value) =>
                {
                    light.intensity = value;
                },
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'light.castShadow',
                () => light.castShadow,
                (value) =>
                {
                    light.castShadow = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'light.range',
                () => light.range,
                (value) =>
                {
                    light.range = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'light.radius',
                () => light.radius,
                (value) =>
                {
                    light.radius = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'light.coneAngle',
                () => light.coneAngle,
                (value) =>
                {
                    light.coneAngle = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'light.penumbra',
                () => light.penumbra,
                (value) =>
                {
                    light.penumbra = value;
                },
            ),
        ),
    );
}
