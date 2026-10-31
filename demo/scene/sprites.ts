import { AnimatedSprite, NineSliceSprite, Sprite, TilingSprite } from 'pixi.js';
import { GifSource, GifSprite } from 'pixi.js/gif';
import { labeledSection } from './layout';

import type { Container } from 'pixi.js';
import type { DemoTextures } from '../textures';

export function buildSpritesSection(textures: DemoTextures): Container
{
    const section = labeledSection('sprites');

    const sprite = new Sprite(textures.solid);

    sprite.label = 'Sprite';
    sprite.anchor.set(0.5);
    sprite.width = 32;
    sprite.height = 32;
    sprite.position.set(15, 18);
    sprite.tint = 0x4ade80;
    sprite.eventMode = 'static';
    sprite.cursor = 'grab';

    const anim = new AnimatedSprite({
        textures       : textures.animFrames,
        animationSpeed : 0.12,
        autoPlay       : true,
        loop           : true,
    });

    anim.label = 'AnimSprite';
    anim.width = 32;
    anim.height = 32;
    anim.position.set(46, 3);

    const tiling = new TilingSprite({
        texture      : textures.checker,
        width        : 50,
        height       : 32,
        tileScale    : { x: 0.3, y: 0.3 },
        tilePosition : { x: 0, y: 0 },
    });

    tiling.label = 'TilingSprite';
    tiling.position.set(87, 3);

    const nine = new NineSliceSprite({
        texture      : textures.nineSlice,
        leftWidth    : 12,
        rightWidth   : 12,
        topHeight    : 12,
        bottomHeight : 12,
        width        : 50,
        height       : 32,
    });

    nine.label = 'NineSlice';
    nine.position.set(148, 3);

    const gifSource = new GifSource(textures.gifSourceFrames);
    const gif = new GifSprite({
        source         : gifSource,
        animationSpeed : 1,
        loop           : true,
        autoPlay       : true,
    });

    gif.label = 'GifSprite';
    gif.position.set(0, 44);
    gif.width = 32;
    gif.height = 32;

    section.addChild(sprite, anim, tiling, nine, gif);

    return section;
}
