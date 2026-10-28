import {
    Container,
    DOMContainer,
    Particle,
    ParticleContainer,
    Rectangle,
    RenderContainer,
    RenderLayer,
    Sprite,
} from 'pixi.js';
import { labeledSection } from './layout';

import type { DemoTextures } from '../textures';

export function buildSpecialSection(textures: DemoTextures): Container
{
    const section = labeledSection('special');

    const particles = new ParticleContainer({
        texture    : textures.solid,
        boundsArea : new Rectangle(0, 0, 72, 41),
    });

    particles.label = 'Particles';
    particles.position.set(0, 0);

    for (let i = 0; i < 6; i++)
    {
        particles.addParticle(new Particle({
            texture : textures.solid,
            x       : (i % 3) * 20,
            y       : Math.floor(i / 3) * 18,
            scaleX  : 0.28,
            scaleY  : 0.28,
            tint    : i % 2 === 0 ? 0x86efac : 0xfde68a,
        }));
    }

    const renderBox = new RenderContainer({
        render    : () => undefined,
        addBounds : (bounds) =>
        {
            bounds.minX = 0;
            bounds.minY = 0;
            bounds.maxX = 41;
            bounds.maxY = 41;
        },
    });

    renderBox.label = 'RenderCtr';
    renderBox.position.set(92, 0);

    const renderHint = new Sprite(textures.checker);

    renderHint.label = 'RenderHint';
    renderHint.width = 41;
    renderHint.height = 41;
    renderHint.position.set(92, 0);
    renderHint.alpha = 0.45;

    const input = document.createElement('div');

    input.textContent = 'DOM';

    input.style.cssText = [
        'width:56px',
        'height:28px',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:#1e293b',
        'color:#e2e8f0',
        'border:1px solid #64748b',
        'font:14px ui-monospace,monospace',
        'pointer-events:none',
    ].join(';');

    const dom = new DOMContainer({
        element : input,
        anchor  : 0,
    });

    dom.label = 'DOMContainer';
    dom.position.set(143, 5);

    const layerHost = new Container();

    layerHost.label = 'LayerHost';
    layerHost.position.set(215, 0);

    const under = new Sprite(textures.solid);

    under.label = 'LayerUnder';
    under.tint = 0x64748b;
    under.width = 36;
    under.height = 36;

    const over = new Sprite(textures.animFrames[0] ?? textures.solid);

    over.label = 'LayerOver';
    over.width = 26;
    over.height = 26;
    over.position.set(13, 5);
    over.zIndex = 10;

    layerHost.addChild(under, over);

    const layer = new RenderLayer({ sortableChildren: true });

    layer.label = 'RenderLayer';
    layer.attach(over);

    section.addChild(particles, renderHint, renderBox, dom, layerHost, layer);

    return section;
}
