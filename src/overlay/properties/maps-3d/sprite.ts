import { readSprite3D } from '../../../page-ops/sprite-3d';
import { type AppendMapsContext, directNumber, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';

export function appendSpriteMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const sprite = readSprite3D(node);

    if (!sprite)
    {
        return;
    }

    const { allow, numbers } = ctx;

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'sprite.pixelSize',
                () => sprite.pixelSize,
                (value) =>
                {
                    sprite.pixelSize = value;
                },
            ),
        ),
    );
}
