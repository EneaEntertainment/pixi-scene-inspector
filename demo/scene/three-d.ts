import {
    AmbientLight,
    BatchedMesh3D,
    Container3D,
    CubeGeometry,
    DirectionalLight,
    Material3D,
    Matrix4,
    Mesh3D,
    ParticleContainer3D,
    PointLight,
    RenderPassBit,
    SphereGeometry,
    SpotLight,
    Sprite3D,
    View3D,
} from '@pixi/3d';
import { labeledSection } from './layout';

import type { Container } from 'pixi.js';

const VIEW_W = 280;
const VIEW_H = 150;

export function buildThreeDSection(): Container
{
    const section = labeledSection('3d');

    const view = new View3D({
        width       : VIEW_W,
        height      : VIEW_H,
        environment : { skyColor: 0xc9d6ff, groundColor: 0x3a2f45, intensity: 0.55 },
    });

    view.label = 'View3D';
    view.position.set(0, 0);

    view.camera.fov = 40;
    view.camera.position.set(0, 1.35, 4.2);
    view.camera.lookAt({ x: 0, y: 0.35, z: 0 });

    const group = new Container3D({ label: 'Group3D' });

    group.position.set(-0.55, 0, 0);

    const cube = new Mesh3D({
        geometry : new CubeGeometry(),
        material : new Material3D({ baseColor: 0x2dd4bf }),
        label    : 'MeshCube',
        scale    : 0.55,
        rotation : { x: 0.35, y: 0.7, z: 0.1 },
    });

    cube.position.set(0, 0.35, 0);

    const ball = new Mesh3D({
        geometry : new SphereGeometry({ radius: 0.28 }),
        material : new Material3D({ baseColor: 0xfbbf24, metallic: 0.2, roughness: 0.35 }),
        label    : 'MeshSphere',
    });

    ball.position.set(0.85, 0.28, 0.15);

    const nest = new Container3D({ label: 'Nest3D' });

    nest.position.set(-0.85, 0.15, 0.2);

    const nestCube = new Mesh3D({
        geometry : new CubeGeometry(),
        material : new Material3D({ baseColor: 0x818cf8 }),
        label    : 'NestMesh',
        scale    : 0.28,
    });

    nest.addChild(nestCube);
    group.addChild(cube, ball, nest);

    const billboard = new Sprite3D({
        label    : 'Sprite3D',
        tint     : 0xf472b6,
        width    : 0.45,
        height   : 0.45,
        position : { x: 1.35, y: 0.7, z: 0 },
    });

    const batchGeo = new CubeGeometry();
    const batchMat = new Material3D({ baseColor: 0x34d399 });
    const batch = new BatchedMesh3D({ size: 3, label: 'BatchedMesh3D' });
    const matrix = new Matrix4();

    for (let i = 0; i < 3; i++)
    {
        batch.setGeometryAt(i, batchGeo);
        batch.setMaterialAt(i, batchMat);
        batch.setMatrixAt(
            i,
            matrix
                .identity()
                .scale({ x: 0.18, y: 0.18, z: 0.18 })
                .setPosition({ x: 0.2 + (i * 0.35), y: -0.35, z: 0.55 }),
        );
        batch.setPassesAt(i, RenderPassBit.OPAQUE);
    }

    const particles = new ParticleContainer3D({
        capacity : 6,
        space    : 'local',
        label    : 'ParticleContainer3D',
    });

    for (let i = 0; i < 6; i++)
    {
        particles.setParticleAt(
            i,
            -1.2 + ((i % 3) * 0.22),
            0.85 + (Math.floor(i / 3) * 0.22),
            0.4,
            0.12,
            0,
            i % 2 === 0 ? 0x86efac : 0xfde68a,
            0.95,
        );
    }

    particles.upload();

    const sun = new DirectionalLight({
        intensity : 2.4,
        label     : 'DirectionalLight',
        position  : { x: -2.5, y: 3.5, z: 2 },
    });

    sun.lookAt({ x: 0, y: 0, z: 0 });

    const lamp = new PointLight({
        color     : 0xffd180,
        intensity : 4,
        range     : 6,
        label     : 'PointLight',
        position  : { x: 1.6, y: 1.4, z: 1.2 },
    });

    const spot = new SpotLight({
        color     : 0xa5f3fc,
        intensity : 6,
        range     : 8,
        coneAngle : 28,
        penumbra  : 0.3,
        label     : 'SpotLight',
        position  : { x: 0.2, y: 2.8, z: 1.5 },
    });

    spot.lookAt({ x: 0.2, y: 0, z: 0 });

    const ambient = new AmbientLight({
        intensity : 0.15,
        label     : 'AmbientLight',
    });

    view.root.addChild(group, billboard, batch, particles, sun, lamp, spot, ambient);
    section.addChild(view);

    return section;
}
