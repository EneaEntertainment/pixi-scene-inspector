import {
    ALPHA_MODE_OPTIONS,
    BILLBOARD_MODE_OPTIONS,
    CAMERA_MODE_OPTIONS,
    CULL_MODE_OPTIONS,
    FOG_TYPE_OPTIONS,
    SHADOW_CASCADE_OPTIONS,
    SHADOW_FILTER_OPTIONS,
    SHADOW_QUALITY_OPTIONS,
    SHADOW_UPDATE_OPTIONS,
    TONE_MAPPING_OPTIONS,
} from './options';

import type { CatalogSectionSpec } from './catalog-section-types';

export const MESH_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'mesh',
        title  : 'Mesh',
        fields : [
            { kind: 'boolean', key: 'mesh.castShadow', label: 'castShadow' },
            { kind: 'boolean', key: 'mesh.receiveShadow', label: 'receiveShadow' },
            {
                kind    : 'select',
                key     : 'billboardMode',
                label   : 'billboardMode',
                options : BILLBOARD_MODE_OPTIONS,
            },
            {
                kind      : 'number',
                key       : 'sprite.pixelSize',
                label     : 'pixelSize',
                step      : 0.001,
                dragAccel : 0.005,
                min       : 0.0001,
            },
        ],
    },
];

export const LIGHT_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'light',
        title  : 'Light',
        fields : [
            { kind: 'color', key: 'light.color', label: 'color' },
            { kind: 'number', key: 'light.intensity', label: 'intensity', step: 0.05, dragAccel: 0.25, min: 0 },
            { kind: 'boolean', key: 'light.castShadow', label: 'castShadow' },
            { kind: 'number', key: 'light.range', label: 'range', step: 0.1, dragAccel: 0.5, min: 0 },
            { kind: 'number', key: 'light.radius', label: 'radius', step: 0.05, dragAccel: 0.25, min: 0 },
            { kind: 'number', key: 'light.coneAngle', label: 'coneAngle', step: 0.5, dragAccel: 1, min: 0, max: 90 },
            { kind: 'number', key: 'light.penumbra', label: 'penumbra', step: 0.05, dragAccel: 0.25, min: 0, max: 1 },
        ],
    },
    {
        id     : 'lightShadow',
        title  : 'Shadow',
        fields : [
            {
                kind      : 'number',
                key       : 'light.shadow.bias',
                label     : 'bias',
                step      : 0.0005,
                dragAccel : 0.002,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'light.shadow.normalBias',
                label     : 'normalBias',
                step      : 0.01,
                dragAccel : 0.05,
                min       : 0,
            },
            {
                kind    : 'select',
                key     : 'light.shadow.cascades',
                label   : 'cascades',
                options : SHADOW_CASCADE_OPTIONS,
            },
            {
                kind      : 'number',
                key       : 'light.shadow.maxDistance',
                label     : 'maxDistance',
                step      : 1,
                dragAccel : 5,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'light.shadow.lambda',
                label     : 'lambda',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
                max       : 1,
            },
            {
                kind    : 'select',
                key     : 'light.shadow.update',
                label   : 'update',
                options : SHADOW_UPDATE_OPTIONS,
            },
        ],
    },
];

export const CAMERA_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'camera',
        title  : 'Camera',
        fields : [
            { kind: 'number', key: 'camera.fov', label: 'fov', step: 0.5, dragAccel: 1, min: 1, max: 179 },
            { kind: 'number', key: 'camera.zoom', label: 'zoom', step: 0.01, dragAccel: 0.1, min: 0.01 },
            { kind: 'number', key: 'camera.near', label: 'near', step: 0.01, dragAccel: 0.1, min: 0.001 },
            { kind: 'number', key: 'camera.far', label: 'far', step: 1, dragAccel: 5, min: 0.01 },
            {
                kind    : 'select',
                key     : 'camera.mode',
                label   : 'mode',
                options : CAMERA_MODE_OPTIONS,
            },
            {
                kind      : 'number',
                key       : 'camera.orthographicSize',
                label     : 'orthographicSize',
                step      : 0.1,
                dragAccel : 0.5,
                min       : 0.01,
            },
        ],
    },
    {
        id     : 'orbit',
        title  : 'Orbit',
        fields : [
            { kind: 'boolean', key: 'orbit.autoRotate', label: 'autoRotate' },
            {
                kind      : 'number',
                key       : 'orbit.autoRotateSpeed',
                label     : 'autoRotateSpeed',
                step      : 0.1,
                dragAccel : 0.5,
            },
            { kind: 'boolean', key: 'orbit.enableDamping', label: 'enableDamping' },
            { kind: 'boolean', key: 'orbit.autoUpdate', label: 'autoUpdate' },
        ],
    },
];

export const VIEW_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'viewViewport',
        title  : 'Viewport',
        fields : [
            { kind: 'boolean', key: 'view3d.autoResize', label: 'autoResize' },
            {
                kind    : 'select',
                key     : 'view3d.cull',
                label   : 'cull',
                options : CULL_MODE_OPTIONS,
            },
            { kind: 'boolean', key: 'view3d.resolutionInherit', label: 'resolutionInherit' },
            {
                kind      : 'number',
                key       : 'view3d.resolution',
                label     : 'resolution',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0.1,
            },
        ],
    },
    {
        id     : 'viewEnvironment',
        title  : 'Environment',
        fields : [
            { kind: 'boolean', key: 'view3d.background', label: 'background' },
            { kind: 'color', key: 'view3d.background.color', label: 'background.color' },
            { kind: 'color', key: 'view3d.background.skyColor', label: 'background.skyColor' },
            { kind: 'color', key: 'view3d.background.groundColor', label: 'background.groundColor' },
            { kind: 'color', key: 'view3d.env.skyColor', label: 'env.skyColor' },
            { kind: 'color', key: 'view3d.env.groundColor', label: 'env.groundColor' },
            {
                kind      : 'number',
                key       : 'view3d.env.intensity',
                label     : 'env.intensity',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
            },
        ],
    },
    {
        id     : 'viewShadows',
        title  : 'Shadows',
        fields : [
            {
                kind    : 'select',
                key     : 'view3d.shadowQuality',
                label   : 'shadowQuality',
                options : SHADOW_QUALITY_OPTIONS,
            },
            {
                kind    : 'select',
                key     : 'view3d.shadowFilter',
                label   : 'shadowFilter',
                options : SHADOW_FILTER_OPTIONS,
            },
        ],
    },
    {
        id     : 'viewFog',
        title  : 'Fog',
        fields : [
            { kind: 'boolean', key: 'view3d.fog', label: 'fog' },
            {
                kind    : 'select',
                key     : 'view3d.fog.type',
                label   : 'type',
                options : FOG_TYPE_OPTIONS,
            },
            { kind: 'color', key: 'view3d.fog.color', label: 'color' },
            {
                kind      : 'number',
                key       : 'view3d.fog.near',
                label     : 'near',
                step      : 0.5,
                dragAccel : 1,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'view3d.fog.far',
                label     : 'far',
                step      : 0.5,
                dragAccel : 1,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'view3d.fog.density',
                label     : 'density',
                step      : 0.005,
                dragAccel : 0.05,
                min       : 0,
            },
        ],
    },
    {
        id     : 'viewLook',
        title  : 'Look',
        fields : [
            { kind: 'number', key: 'view3d.exposure', label: 'exposure', step: 0.05, dragAccel: 0.25, min: 0 },
            {
                kind    : 'select',
                key     : 'view3d.toneMapping',
                label   : 'toneMapping',
                options : TONE_MAPPING_OPTIONS,
            },
        ],
    },
];

export const MATERIAL_CATALOG_SECTIONS: Array<CatalogSectionSpec> = [
    {
        id     : 'material',
        title  : 'Material',
        fields : [
            { kind: 'color', key: 'material.baseColor', label: 'baseColor' },
            {
                kind    : 'select',
                key     : 'material.alphaMode',
                label   : 'alphaMode',
                options : ALPHA_MODE_OPTIONS,
            },
            { kind: 'number', key: 'material.alpha', label: 'alpha', step: 0.05, dragAccel: 0.25, min: 0, max: 1 },
            {
                kind      : 'number',
                key       : 'material.alphaCutoff',
                label     : 'alphaCutoff',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
                max       : 1,
            },
            {
                kind      : 'number',
                key       : 'material.metallic',
                label     : 'metallic',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
                max       : 1,
            },
            {
                kind      : 'number',
                key       : 'material.roughness',
                label     : 'roughness',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
                max       : 1,
            },
            {
                kind      : 'number',
                key       : 'material.normalScale',
                label     : 'normalScale',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'material.occlusionStrength',
                label     : 'occlusionStrength',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'material.ior',
                label     : 'ior',
                step      : 0.01,
                dragAccel : 0.1,
                min       : 1,
            },
            { kind: 'color', key: 'material.emissive.color', label: 'emissive.color' },
            {
                kind      : 'number',
                key       : 'material.emissive.strength',
                label     : 'emissive.strength',
                step      : 0.1,
                dragAccel : 0.5,
                min       : 0,
            },
            {
                kind      : 'number',
                key       : 'material.shininess',
                label     : 'shininess',
                step      : 1,
                dragAccel : 5,
                min       : 1,
            },
            { kind: 'color', key: 'material.specularColor', label: 'specularColor' },
            {
                kind      : 'number',
                key       : 'material.specularStrength',
                label     : 'specularStrength',
                step      : 0.05,
                dragAccel : 0.25,
                min       : 0,
            },
        ],
    },
    {
        id     : 'materialTextures',
        title  : 'Textures',
        fields : [
            { kind: 'texture', key: 'material.textures.baseColor', label: 'baseColor' },
            {
                kind  : 'texture',
                key   : 'material.textures.metallicRoughness',
                label : 'metallicRoughness',
            },
            { kind: 'texture', key: 'material.textures.normal', label: 'normal' },
            { kind: 'texture', key: 'material.textures.occlusion', label: 'occlusion' },
            { kind: 'texture', key: 'material.textures.emissive', label: 'emissive' },
            { kind: 'texture', key: 'material.textures.specular', label: 'specular' },
        ],
    },
];
