import {
    MATERIAL_ALPHA_MODES,
    MATERIAL_TEXTURE_SLOTS,
    materialHasTextureSlot,
    materialKind,
    materialTextureName,
    type MaterialTextureSlot,
    readEmissive,
    readMaterial3D,
    setMaterialTextureByName,
} from '../../../page-ops/material-3d';
import { colorToString, parseColorString } from '../../text/colors';
import { type AppendMapsContext, directNumber, directString, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { StringPropertyKey } from '../property-keys';

const TEXTURE_SLOT_KEYS: Record<MaterialTextureSlot, StringPropertyKey> = {
    baseColor         : 'material.textures.baseColor',
    metallicRoughness : 'material.textures.metallicRoughness',
    normal            : 'material.textures.normal',
    occlusion         : 'material.textures.occlusion',
    emissive          : 'material.textures.emissive',
    specular          : 'material.textures.specular',
};

function appendTextureSlotMaps(
    material: NonNullable<ReturnType<typeof readMaterial3D>>,
    ctx: AppendMapsContext,
): void
{
    const { allow, strings } = ctx;

    for (const slot of MATERIAL_TEXTURE_SLOTS)
    {
        const key = TEXTURE_SLOT_KEYS[slot];

        if (!allow(key) || !materialHasTextureSlot(material, slot))
        {
            continue;
        }

        strings.push({
            key,

            get: () => materialTextureName(material, slot),

            set: (value) =>
            {
                setMaterialTextureByName(material, slot, value);
            },
        });
    }
}

export function appendMaterialMaps(node: PixiNode, ctx: AppendMapsContext): void
{
    const material = readMaterial3D(node);

    if (!material)
    {
        return;
    }

    const { allow, numbers, strings } = ctx;
    const kind = materialKind(material);

    if (allow('material.baseColor') && colorToString(material.baseColor) !== undefined)
    {
        strings.push({
            key: 'material.baseColor',

            get: () => colorToString(material.baseColor),

            set: (value) =>
            {
                try
                {
                    material.baseColor = parseColorString(value);
                }
                catch
                {
                    void 0;
                }
            },
        });
    }

    appendTextureSlotMaps(material, ctx);

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'material.alphaMode',
                () => material.alphaMode,
                (value) =>
                {
                    if (MATERIAL_ALPHA_MODES.has(value))
                    {
                        material.alphaMode = value;
                    }
                },
            ),
        ),
    );

    if (material.alphaMode === 'blend' || material.alphaMode === 'mask')
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.alpha',
                    () => material.alpha,
                    (value) =>
                    {
                        material.alpha = value;
                    },
                ),
            ),
        );
    }

    if (material.alphaMode === 'mask')
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.alphaCutoff',
                    () => material.alphaCutoff,
                    (value) =>
                    {
                        material.alphaCutoff = value;
                    },
                ),
            ),
        );
    }

    if (kind === 'pbr')
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.metallic',
                    () => material.metallic,
                    (value) =>
                    {
                        material.metallic = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.roughness',
                    () => material.roughness,
                    (value) =>
                    {
                        material.roughness = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.normalScale',
                    () => material.normalScale,
                    (value) =>
                    {
                        material.normalScale = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.occlusionStrength',
                    () => material.occlusionStrength,
                    (value) =>
                    {
                        material.occlusionStrength = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.ior',
                    () => material.ior,
                    (value) =>
                    {
                        material.ior = value;
                    },
                ),
            ),
        );
    }

    if (kind === 'phong')
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.shininess',
                    () => material.shininess,
                    (value) =>
                    {
                        material.shininess = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.specularStrength',
                    () => material.specularStrength,
                    (value) =>
                    {
                        material.specularStrength = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.normalScale',
                    () => material.normalScale,
                    (value) =>
                    {
                        material.normalScale = value;
                    },
                ),
            ),
        );

        if (allow('material.specularColor') && colorToString(material.specularColor) !== undefined)
        {
            strings.push({
                key: 'material.specularColor',

                get: () => colorToString(material.specularColor),

                set: (value) =>
                {
                    try
                    {
                        material.specularColor = parseColorString(value);
                    }
                    catch
                    {
                        void 0;
                    }
                },
            });
        }
    }

    const emissive = readEmissive(material);

    if (!emissive)
    {
        return;
    }

    if (allow('material.emissive.color') && colorToString(emissive.color) !== undefined)
    {
        strings.push({
            key: 'material.emissive.color',

            get: () => colorToString(emissive.color),

            set: (value) =>
            {
                try
                {
                    emissive.color = parseColorString(value);
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
                'material.emissive.strength',
                () => emissive.strength,
                (value) =>
                {
                    emissive.strength = value;
                },
            ),
        ),
    );
}
