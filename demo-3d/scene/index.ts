import { Assets, Cache } from 'pixi.js';
import {
    CubeGeometry,
    DirectionalLight,
    Material3D,
    Mesh3D,
    Model3D,
    PlaneGeometry,
    View3D,
} from '@pixi/3d';
import { OrbitCamera } from '@pixi/3d/extras';

import type { Application, Texture } from 'pixi.js';
import type { Scene3DSource } from '@pixi/3d';

const MODELS_BASE = `${import.meta.env.BASE_URL}models/`;
const CESIUM_URL = `${MODELS_BASE}CesiumMan/CesiumMan.gltf`;
const FOX_URL = `${MODELS_BASE}Fox.glb`;
const CESIUM_HEIGHT = 2;
const FOX_HEIGHT = 1.1;

function registerSourceTextures(prefix: string, source: Scene3DSource): void
{
    const seen = new Set<Texture>();
    const named = new Map<Texture, string>();

    for (const [name, texture] of Object.entries(source.texture))
    {
        if (texture)
        {
            named.set(texture, name);
        }
    }

    source.textures.forEach((texture, index) =>
    {
        if (!texture || seen.has(texture))
        {
            return;
        }

        seen.add(texture);

        const gltfName = named.get(texture);
        const key = gltfName ? `${prefix}/${gltfName}` : `${prefix}/${index}`;

        texture.label = key;
        Cache.set(key, texture);
    });
}

function placeOnFloor(model: Model3D, targetHeight: number, x: number): void
{
    const bounds = model.getLocalBounds();
    const size = bounds.getSize();
    const center = bounds.getCenter();
    const s = targetHeight / size.y;

    model.scale.set(s, s, s);
    model.position.set(x - (center.x * s), -bounds.min.y * s, -(center.z * s));
}

export type ThreeDDemoScene = {
    view: View3D;
    cesiumMan: Model3D;
    fox: Model3D;
};

export async function buildThreeDDemoScene(app: Application): Promise<ThreeDDemoScene>
{
    const view = new View3D({
        autoResize    : true,
        shadowQuality : 'medium',
        background    : 0x1a1a2e,
        environment   : { skyColor: 0xc9d6ff, groundColor: 0x3a2f45, intensity: 0.55 },
        fog           : { type: 'linear', color: 0x1a1a2e, near: 8, far: 22 },
        label         : 'View3D',
    });

    app.stage.addChild(view);

    const sun = new DirectionalLight({
        color      : 0xfff2dc,
        intensity  : 3,
        castShadow : true,
        label      : 'Sun',
    });

    sun.position.set(-3, 6, 4);
    sun.lookAt({ x: 0, y: 0, z: 0 });

    const floor = new Mesh3D({
        geometry      : new PlaneGeometry({ width: 60, height: 60 }),
        material      : new Material3D({ baseColor: 0x4b5563, roughness: 0.92, metallic: 0 }),
        castShadow    : false,
        receiveShadow : true,
        label         : 'Floor',
    });

    floor.rotation.x = -Math.PI / 2;

    const marker = new Mesh3D({
        geometry   : new CubeGeometry({ width: 0.35, height: 0.35, depth: 0.35 }),
        material   : new Material3D({ baseColor: 0xdd4444, roughness: 0.45 }),
        castShadow : true,
        label      : 'MarkerCube',
        position   : { x: 0, y: 0.175, z: -2.2 },
    });

    view.root.addChild(floor, sun, marker);

    const [cesiumSource, foxSource] = await Promise.all([
        Assets.load<Scene3DSource>(CESIUM_URL),
        Assets.load<Scene3DSource>(FOX_URL),
    ]);

    registerSourceTextures('demo3d/cesium', cesiumSource);
    registerSourceTextures('demo3d/fox', foxSource);

    const cesiumMan = new Model3D({
        source     : cesiumSource,
        castShadow : true,
        label      : 'CesiumMan',
        autoPlay   : true,
    });

    const fox = new Model3D({
        source     : foxSource,
        castShadow : true,
        label      : 'Fox',
        autoPlay   : 'Walk',
    });

    placeOnFloor(cesiumMan, CESIUM_HEIGHT, -1.4);
    placeOnFloor(fox, FOX_HEIGHT, 1.6);
    fox.rotation.y = -Math.PI / 5;

    view.root.addChild(cesiumMan, fox);

    view.camera.position.set(0, 2.2, 6.5);
    view.camera.far = 100;
    view.camera.lookAt({ x: 0, y: 1, z: 0 });

    const orbitCamera = new OrbitCamera({
        view,
        target        : { x: 0, y: 1, z: 0 },
        enableDamping : true,
        minDistance   : 2,
        maxDistance   : 18,
    });

    Object.assign(view, { orbitCamera });

    app.ticker.add((ticker) =>
    {
        marker.rotation.y += 0.8 * (ticker.deltaMS / 1000);
    });

    return {
        view,
        cesiumMan,
        fox,
    };
}
