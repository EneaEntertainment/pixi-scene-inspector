import { readCamera3D, readOrbitCamera } from '../../../page-ops/props-3d';
import { type AppendMapsContext, directBoolean, directNumber, directString, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';

export function appendCameraMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const camera = readCamera3D(node);

    if (!camera)
    {
        return;
    }

    const { allow, numbers, booleans, strings } = ctx;

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'camera.fov',
                () => camera.fov,
                (value) =>
                {
                    camera.fov = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'camera.zoom',
                () => camera.zoom,
                (value) =>
                {
                    camera.zoom = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'camera.near',
                () => camera.near,
                (value) =>
                {
                    camera.near = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'camera.far',
                () => camera.far,
                (value) =>
                {
                    camera.far = value;
                },
            ),
        ),
    );

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'camera.mode',
                () => camera.mode,
                (value) =>
                {
                    camera.mode = value;
                },
            ),
        ),
    );

    if (camera.mode === 'orthographic')
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'camera.orthographicSize',
                    () => camera.orthographicSize,
                    (value) =>
                    {
                        camera.orthographicSize = value;
                    },
                ),
            ),
        );
    }

    const orbit = readOrbitCamera(node);

    if (!orbit)
    {
        return;
    }

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'orbit.autoRotate',
                () => orbit.autoRotate,
                (value) =>
                {
                    orbit.autoRotate = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'orbit.autoRotateSpeed',
                () => orbit.autoRotateSpeed,
                (value) =>
                {
                    orbit.autoRotateSpeed = value;
                },
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'orbit.enableDamping',
                () => orbit.enableDamping,
                (value) =>
                {
                    orbit.enableDamping = value;
                },
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'orbit.autoUpdate',
                () => orbit.autoUpdate,
                (value) =>
                {
                    orbit.autoUpdate = value;
                },
            ),
        ),
    );
}
