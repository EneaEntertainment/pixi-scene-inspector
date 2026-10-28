import { Graphics } from 'pixi.js';
import { labeledSection } from './layout';

import type { Container } from 'pixi.js';

export function buildGraphicsSection(): Container
{
    const section = labeledSection('graphics');

    const rect = new Graphics().roundRect(0, 0, 51, 36, 5).fill(0xf07006);

    rect.label = 'GfxRect';
    rect.position.set(0, 0);

    const circle = new Graphics().circle(18, 18, 18).fill(0xfb923c);

    circle.label = 'GfxCircle';
    circle.position.set(67, 0);

    const poly = new Graphics()
        .poly([0, 36, 23, 0, 46, 36])
        .fill(0xea580c)
        .stroke({ width: 1, color: 0xffedd5 });

    poly.label = 'GfxPoly';
    poly.position.set(118, 0);

    const line = new Graphics()
        .moveTo(0, 31)
        .bezierCurveTo(15, 0, 31, 36, 51, 8)
        .stroke({ width: 4, color: 0xfdba74 });

    line.label = 'GfxLine';
    line.position.set(179, 3);

    section.addChild(rect, circle, poly, line);

    return section;
}
