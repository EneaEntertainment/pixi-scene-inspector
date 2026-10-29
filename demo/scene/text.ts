import {
    BitmapFont,
    BitmapFontManager,
    BitmapText,
    FillGradient,
    HTMLText,
    SplitBitmapText,
    SplitText,
    Text,
} from 'pixi.js';
import { labeledSection } from './layout';

import type { Container } from 'pixi.js';

export function buildTextSection(): Container
{
    const section = labeledSection('text');

    BitmapFont.install({
        name  : 'DemoBitmap',
        style : {
            fontFamily : 'Arial',
            fontSize   : 23,
            fill       : 0xf8fafc,
        },
        chars: BitmapFontManager.ALPHANUMERIC,
    });

    const gradient = new FillGradient({
        type       : 'linear',
        start      : { x: 0, y: 0 },
        end        : { x: 0, y: 1 },
        colorStops : [
            { offset: 0, color: 0x88ff88 },
            { offset: 1, color: 0x228844 },
        ],
    });

    const rich = new Text({
        text  : 'Rich',
        style : {
            fontSize   : 20,
            fill       : gradient,
            stroke     : { color: 0x0f172a, width: 3, join: 'round' },
            dropShadow : {
                alpha    : 0.7,
                angle    : Math.PI / 4,
                blur     : 1,
                color    : 0x000000,
                distance : 3,
            },
            letterSpacing : 0.6,
            align         : 'left',
        },
    });

    rich.label = 'RichText';
    rich.position.set(0, 0);

    const longNamed = new Text({
        text  : 'long',
        style : { fill: 0xffcc66, fontSize: 18 },
    });

    longNamed.label = 'ThisIsReallyLongNodeLabelForTestingFullHintAndPropsTitle';
    longNamed.position.set(67, 3);

    const bitmap = new BitmapText({
        text  : 'Bmp',
        style : {
            fontFamily : 'DemoBitmap',
            fontSize   : 20,
        },
    });

    bitmap.label = 'BitmapText';
    bitmap.position.set(128, 0);

    const html = new HTMLText({
        text  : '<b>HTML</b>',
        style : {
            fontSize   : 18,
            fill       : '#93c5fd',
            fontFamily : 'Arial',
        },
    });

    html.label = 'HTMLText';
    html.position.set(179, 3);

    const split = new SplitText({
        text       : 'Split',
        style      : { fontSize: 18, fill: 0xfda4af },
        autoSplit  : true,
        charAnchor : 0.5,
    });

    split.label = 'SplitText';
    split.position.set(0, 44);

    const splitBmp = new SplitBitmapText({
        text  : 'SBmp',
        style : {
            fontFamily : 'DemoBitmap',
            fontSize   : 18,
        },
        autoSplit  : true,
        charAnchor : 0.5,
    });

    splitBmp.label = 'SplitBmpText';
    splitBmp.position.set(82, 44);

    section.addChild(rich, longNamed, bitmap, html, split, splitBmp);

    return section;
}
