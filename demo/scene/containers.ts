import { Container, Graphics } from 'pixi.js';
import { labeledSection } from './layout';

export function buildContainersSection(): Container
{
    const section = labeledSection('containers');

    const nest = new Container();

    nest.label = 'Nest';
    nest.sortableChildren = true;
    nest.position.set(0, 0);

    const mid = new Container();

    mid.label = 'NestMid';
    mid.eventMode = 'static';
    mid.cursor = 'pointer';

    const leaf = new Graphics().roundRect(0, 0, 51, 36, 8).fill(0x64748b);

    leaf.label = 'NestLeaf';
    leaf.zIndex = 2;
    mid.addChild(leaf);
    nest.addChild(mid);

    const deep = new Container();

    deep.label = 'DeepA';

    const deepB = new Container();

    deepB.label = 'DeepB';

    const deepC = new Container();

    deepC.label = 'DeepC';

    const deepGfx = new Graphics().star(18, 18, 5, 15, 6).fill(0x94a3b8);

    deepGfx.label = 'DeepGfx';
    deepC.addChild(deepGfx);
    deepB.addChild(deepC);
    deep.addChild(deepB);
    deep.position.set(72, 0);

    const hidden = new Container();

    hidden.label = 'HiddenBranch';
    hidden.visible = false;
    hidden.position.set(128, 0);

    const hiddenGfx = new Graphics().rect(0, 0, 36, 36).fill(0xf43f5e);

    hiddenGfx.label = 'HiddenGfx';
    hidden.addChild(hiddenGfx);

    const skewed = new Graphics().rect(0, 0, 36, 36).fill(0x0ea5e9);

    skewed.label = 'Skewed';
    skewed.skew.set(0.2, -0.08);
    skewed.rotation = 0.15;
    skewed.alpha = 0.85;
    skewed.blendMode = 'add';
    skewed.position.set(143, 5);

    const emptyLabel = new Graphics().circle(15, 15, 15).fill(0xa78bfa);

    emptyLabel.label = '';
    emptyLabel.position.set(205, 5);

    section.addChild(nest, deep, hidden, skewed, emptyLabel);

    return section;
}
