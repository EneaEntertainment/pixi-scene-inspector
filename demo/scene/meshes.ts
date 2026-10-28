import {
    Mesh,
    MeshGeometry,
    MeshPlane,
    MeshRope,
    MeshSimple,
    PerspectiveMesh,
    Point,
} from 'pixi.js';
import { labeledSection } from './layout';

import type { Container } from 'pixi.js';
import type { DemoTextures } from '../textures';

export function buildMeshesSection(textures: DemoTextures): Container
{
    const section = labeledSection('meshes');

    const simple = new MeshSimple({
        texture  : textures.mesh,
        vertices : new Float32Array([0, 0, 36, 0, 18, 33]),
        uvs      : new Float32Array([0, 0, 1, 0, 0.5, 1]),
        indices  : new Uint32Array([0, 1, 2]),
    });

    simple.label = 'MeshSimple';
    simple.position.set(0, 0);

    const plane = new MeshPlane({
        texture   : textures.mesh,
        verticesX : 3,
        verticesY : 3,
    });

    plane.label = 'MeshPlane';
    plane.scale.set(0.41);
    plane.position.set(46, 0);

    const ropePoints = [
        new Point(0, 15),
        new Point(13, 3),
        new Point(26, 18),
        new Point(38, 5),
        new Point(51, 15),
    ];

    const rope = new MeshRope({
        texture : textures.mesh,
        points  : ropePoints,
    });

    rope.label = 'MeshRope';
    rope.scale.set(0.7);
    rope.position.set(92, 5);

    const perspective = new PerspectiveMesh({
        texture   : textures.mesh,
        verticesX : 5,
        verticesY : 5,
        x0        : 0,
        y0        : 8,
        x1        : 41,
        y1        : 0,
        x2        : 41,
        y2        : 33,
        x3        : 0,
        y3        : 28,
    });

    perspective.label = 'PerspMesh';
    perspective.position.set(151, 0);

    const geometry = new MeshGeometry({
        positions : new Float32Array([0, 0, 28, 0, 28, 28, 0, 28]),
        uvs       : new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices   : new Uint32Array([0, 1, 2, 0, 2, 3]),
    });

    const mesh = new Mesh({
        geometry,
        texture: textures.solid,
    });

    mesh.label = 'Mesh';
    mesh.position.set(205, 3);

    section.addChild(simple, plane, rope, perspective, mesh);

    return section;
}
