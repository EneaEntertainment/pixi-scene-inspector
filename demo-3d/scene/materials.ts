import { Matrix } from 'pixi.js';
import {
    Container3D,
    FlatMaterial,
    Material3D,
    Mesh3D,
    PhongMaterial,
    SphereGeometry,
} from '@pixi/3d';
import { ToonMaterial } from '@pixi/3d/extras';

const SPHERE_RADIUS = 0.28;
const ROW_Z = -3.6;
const ROW_Y = SPHERE_RADIUS;
const SPACING = 0.75;

function sphere(
    label: string,
    material: Material3D | PhongMaterial | FlatMaterial | ToonMaterial,
    index: number,
    count: number,
): Mesh3D
{
    const x = (index - ((count - 1) / 2)) * SPACING;

    return new Mesh3D({
        geometry      : new SphereGeometry({ radius: SPHERE_RADIUS, widthSegments: 32, heightSegments: 24 }),
        material,
        castShadow    : true,
        receiveShadow : true,
        label,
        position      : { x, y: ROW_Y, z: ROW_Z },
    });
}

export function buildMaterialShowcase(): Container3D
{
    const root = new Container3D({ label: 'Materials' });

    const specs: Array<{
        label: string;
        material: Material3D | PhongMaterial | FlatMaterial | ToonMaterial;
    }> = [
        {
            label    : 'MatPbr',
            material : new Material3D({
                label     : 'pbr-metal',
                baseColor : 0xc0c8d4,
                metallic  : 1,
                roughness : 0.22,
            }),
        },
        {
            label    : 'MatEmissive',
            material : new Material3D({
                label     : 'emissive',
                baseColor : 0x111111,
                roughness : 0.6,
                emissive  : { color: 0x44ddff, strength: 2.5 },
            }),
        },
        {
            label    : 'MatSpecular',
            material : new Material3D({
                label     : 'specular',
                baseColor : 0x8ab4f8,
                roughness : 0.35,
                metallic  : 0,
                specular  : { factor: 0.85, color: 0xfff2dd },
            }),
        },
        {
            label    : 'MatClearcoat',
            material : new Material3D({
                label     : 'clearcoat',
                baseColor : 0x8c1c13,
                metallic  : 0.15,
                roughness : 0.45,
                clearcoat : { factor: 1, roughness: 0.05 },
            }),
        },
        {
            label    : 'MatSheen',
            material : new Material3D({
                label     : 'sheen',
                baseColor : 0x3b0a45,
                roughness : 0.9,
                metallic  : 0,
                sheen     : { color: 0xd8a0ff, roughness: 0.35 },
            }),
        },
        {
            label    : 'MatTransmission',
            material : new Material3D({
                label        : 'transmission',
                baseColor    : 0x88ddff,
                roughness    : 0.05,
                metallic     : 0,
                ior          : 1.45,
                transmission : {
                    factor              : 1,
                    thickness           : 0.55,
                    attenuationDistance : 1.2,
                    attenuationColor    : 0x2e8b57,
                },
            }),
        },
        {
            label    : 'MatIridescence',
            material : new Material3D({
                label       : 'iridescence',
                baseColor   : 0x222222,
                metallic    : 1,
                roughness   : 0.25,
                iridescence : { factor: 1, ior: 1.3, thicknessMinimum: 100, thicknessMaximum: 600 },
            }),
        },
        {
            label    : 'MatAnisotropy',
            material : new Material3D({
                label      : 'anisotropy',
                baseColor  : 0xd4af37,
                metallic   : 1,
                roughness  : 0.35,
                anisotropy : { strength: 0.85, rotation: Math.PI / 4 },
            }),
        },
        {
            label    : 'MatUv',
            material : new Material3D({
                label       : 'uv-transform',
                baseColor   : 0x4ade80,
                roughness   : 0.7,
                metallic    : 0,
                uvTransform : new Matrix().scale(3, 2),
            }),
        },
        {
            label    : 'MatPhong',
            material : new PhongMaterial({
                label            : 'phong',
                baseColor        : 0x2f6f8b,
                specularColor    : 0xcccccc,
                shininess        : 64,
                specularStrength : 0.85,
                emissive         : { color: 0x112233, strength: 0.2 },
            }),
        },
        {
            label    : 'MatFlat',
            material : new FlatMaterial({
                label       : 'flat',
                baseColor   : 0xf59e0b,
                alphaMode   : 'blend',
                alpha       : 0.85,
                doubleSided : true,
            }),
        },
        {
            label    : 'MatToon',
            material : new ToonMaterial({
                label        : 'toon',
                baseColor    : 0xf4a259,
                bands        : 2,
                rimIntensity : 0.45,
                specularSize : 0.2,
            }),
        },
    ];

    for (let i = 0; i < specs.length; i++)
    {
        const spec = specs[i]!;

        root.addChild(sphere(spec.label, spec.material, i, specs.length));
    }

    return root;
}
