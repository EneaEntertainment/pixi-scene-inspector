import {
    invalidateMaterialHost,
    MATERIAL_ALPHA_MODES,
    MATERIAL_TEXTURE_SLOTS,
    materialHasTextureSlot,
    materialKind,
    materialSupportsUvTransform,
    materialTextureName,
    type MaterialTextureSlot,
    readAnisotropy,
    readClearcoat,
    readEmissive,
    readIridescence,
    readMaterial3D,
    readSheen,
    readSpecularGroup,
    readToonData,
    readTransmission,
    readUvTransform,
    setMaterialTextureByName,
    writeUvTransform,
} from '../../../page-ops/material-3d';
import { colorToString, parseColorString } from '../../text/colors';
import { type AppendMapsContext, directBoolean, directNumber, directString, takeMaps } from './helpers';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { StringPropertyKey } from '../property-keys';

const TEXTURE_SLOT_KEYS: Record<MaterialTextureSlot, StringPropertyKey> = {
    baseColor          : 'material.textures.baseColor',
    metallicRoughness  : 'material.textures.metallicRoughness',
    normal             : 'material.textures.normal',
    occlusion          : 'material.textures.occlusion',
    emissive           : 'material.textures.emissive',
    specular           : 'material.textures.specular',
    clearcoat          : 'material.textures.clearcoat',
    clearcoatRoughness : 'material.textures.clearcoatRoughness',
    clearcoatNormal    : 'material.textures.clearcoatNormal',
    sheen              : 'material.textures.sheen',
    transmission       : 'material.textures.transmission',
    thickness          : 'material.textures.thickness',
    iridescence        : 'material.textures.iridescence',
    anisotropy         : 'material.textures.anisotropy',
};

function appendTextureSlotMaps(material: NonNullable<ReturnType<typeof readMaterial3D>>, ctx: AppendMapsContext)
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

function appendColorMap(
    ctx: AppendMapsContext,
    key: StringPropertyKey,
    getColor: () => unknown,
    setColor: (value: unknown) => void,
)
{
    if (!ctx.allow(key) || colorToString(getColor()) === undefined)
    {
        return;
    }

    ctx.strings.push({
        key,

        get: () => colorToString(getColor()),

        set: (value) =>
        {
            try
            {
                setColor(parseColorString(value));
            }
            catch
            {
                void 0;
            }
        },
    });
}

export function appendMaterialMaps(node: PixiNode, ctx: AppendMapsContext)
{
    const material = readMaterial3D(node);

    if (!material)
    {
        return;
    }

    const { allow, numbers, strings, booleans } = ctx;
    const kind = materialKind(material);

    strings.push(
        ...takeMaps(
            allow,
            directString(
                'material.label',
                () => (typeof material.label === 'string' ? material.label : undefined),
                (value) =>
                {
                    material.label = value;
                },
            ),
        ),
    );

    appendColorMap(
        ctx,
        'material.baseColor',
        () => material.baseColor,
        (value) =>
        {
            material.baseColor = value;
        },
    );

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

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'material.doubleSided',
                () => material.doubleSided,
                () => undefined,
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'material.flatShading',
                () => material.flatShading,
                () => undefined,
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'material.fog',
                () => material.fog,
                () => undefined,
            ),
        ),
    );

    booleans.push(
        ...takeMaps(
            allow,
            directBoolean(
                'material.vertexColors',
                () => material.vertexColors,
                (value) =>
                {
                    material.vertexColors = value;
                    invalidateMaterialHost(node);
                },
            ),
        ),
    );

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

        appendColorMap(
            ctx,
            'material.specularColor',
            () => material.specularColor,
            (value) =>
            {
                material.specularColor = value;
            },
        );
    }

    const emissive = readEmissive(material);

    if (emissive)
    {
        appendColorMap(
            ctx,
            'material.emissive.color',
            () => emissive.color,
            (value) =>
            {
                emissive.color = value;
            },
        );

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

    const specular = readSpecularGroup(material);

    if (specular)
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.specular.factor',
                    () => specular.factor,
                    (value) =>
                    {
                        specular.factor = value;
                    },
                ),
            ),
        );

        appendColorMap(
            ctx,
            'material.specular.color',
            () => specular.color,
            (value) =>
            {
                specular.color = value;
            },
        );
    }

    const clearcoat = readClearcoat(material);

    if (clearcoat)
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.clearcoat.factor',
                    () => clearcoat.factor,
                    (value) =>
                    {
                        clearcoat.factor = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.clearcoat.roughness',
                    () => clearcoat.roughness,
                    (value) =>
                    {
                        clearcoat.roughness = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.clearcoat.normalScale',
                    () => clearcoat.normalScale,
                    (value) =>
                    {
                        clearcoat.normalScale = value;
                    },
                ),
            ),
        );
    }

    const sheen = readSheen(material);

    if (sheen)
    {
        appendColorMap(
            ctx,
            'material.sheen.color',
            () => sheen.color,
            (value) =>
            {
                sheen.color = value;
            },
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.sheen.roughness',
                    () => sheen.roughness,
                    (value) =>
                    {
                        sheen.roughness = value;
                    },
                ),
            ),
        );
    }

    const transmission = readTransmission(material);

    if (transmission)
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.transmission.factor',
                    () => transmission.factor,
                    (value) =>
                    {
                        transmission.factor = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.transmission.thickness',
                    () => transmission.thickness,
                    (value) =>
                    {
                        transmission.thickness = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.transmission.attenuationDistance',
                    () => transmission.attenuationDistance,
                    (value) =>
                    {
                        transmission.attenuationDistance = value;
                    },
                ),
            ),
        );

        appendColorMap(
            ctx,
            'material.transmission.attenuationColor',
            () => transmission.attenuationColor,
            (value) =>
            {
                transmission.attenuationColor = value;
            },
        );
    }

    const iridescence = readIridescence(material);

    if (iridescence)
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.iridescence.factor',
                    () => iridescence.factor,
                    (value) =>
                    {
                        iridescence.factor = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.iridescence.ior',
                    () => iridescence.ior,
                    (value) =>
                    {
                        iridescence.ior = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.iridescence.thicknessMinimum',
                    () => iridescence.thicknessMinimum,
                    (value) =>
                    {
                        iridescence.thicknessMinimum = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.iridescence.thicknessMaximum',
                    () => iridescence.thicknessMaximum,
                    (value) =>
                    {
                        iridescence.thicknessMaximum = value;
                    },
                ),
            ),
        );
    }

    const anisotropy = readAnisotropy(material);

    if (anisotropy)
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.anisotropy.strength',
                    () => anisotropy.strength,
                    (value) =>
                    {
                        anisotropy.strength = value;
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.anisotropy.rotation',
                    () => anisotropy.rotation,
                    (value) =>
                    {
                        anisotropy.rotation = value;
                    },
                ),
            ),
        );
    }

    if (materialSupportsUvTransform(material))
    {
        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.uv.scaleX',
                    () => readUvTransform(material).a,
                    (value) =>
                    {
                        writeUvTransform(material, { a: value });
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.uv.scaleY',
                    () => readUvTransform(material).d,
                    (value) =>
                    {
                        writeUvTransform(material, { d: value });
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.uv.offsetX',
                    () => readUvTransform(material).tx,
                    (value) =>
                    {
                        writeUvTransform(material, { tx: value });
                    },
                ),
            ),
        );

        numbers.push(
            ...takeMaps(
                allow,
                directNumber(
                    'material.uv.offsetY',
                    () => readUvTransform(material).ty,
                    (value) =>
                    {
                        writeUvTransform(material, { ty: value });
                    },
                ),
            ),
        );
    }

    const toon = readToonData(material);

    if (!toon)
    {
        return;
    }

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'material.toon.bands',
                () => toon.bands,
                (value) =>
                {
                    toon.bands = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'material.toon.specularSize',
                () => toon.specularSize,
                (value) =>
                {
                    toon.specularSize = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'material.toon.rimPower',
                () => toon.rimPower,
                (value) =>
                {
                    toon.rimPower = value;
                },
            ),
        ),
    );

    numbers.push(
        ...takeMaps(
            allow,
            directNumber(
                'material.toon.rimIntensity',
                () => toon.rimIntensity,
                (value) =>
                {
                    toon.rimIntensity = value;
                },
            ),
        ),
    );
}
