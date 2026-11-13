import { readBillboard3D, readMeshShadow3D } from '../../../page-ops/props-3d';
import { type AppendMapsContext, directBoolean, directString, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';

export function appendMeshMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const { allow, booleans, strings } = ctx;
    const mesh = readMeshShadow3D(node);

    if (mesh)
    {
        booleans.push(
            ...takeMaps(
                allow,
                directBoolean(
                    'mesh.castShadow',
                    () => mesh.castShadow,
                    (value) =>
                    {
                        mesh.castShadow = value;
                    },
                ),
            ),
        );

        booleans.push(
            ...takeMaps(
                allow,
                directBoolean(
                    'mesh.receiveShadow',
                    () => mesh.receiveShadow,
                    (value) =>
                    {
                        mesh.receiveShadow = value;

                        if (typeof mesh.invalidate === 'function')
                        {
                            mesh.invalidate();
                        }
                    },
                ),
            ),
        );
    }

    const billboard = readBillboard3D(node);

    if (!billboard)
    {
        return;
    }

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'billboardMode',
                () => billboard.billboardMode,
                (value) =>
                {
                    billboard.billboardMode = value;
                },
            ),
        ),
    );
}
