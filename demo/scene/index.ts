import { Container } from 'pixi.js';
import { buildContainersSection } from './containers';
import { buildGraphicsSection } from './graphics';
import { DEMO_SAFE_HEIGHT, DEMO_SAFE_WIDTH } from './layout';
import { buildMeshesSection } from './meshes';
import { buildSpecialSection } from './special';
import { buildSpritesSection } from './sprites';
import { buildTextSection } from './text';

import type { DemoTextures } from '../textures';

const PAD_X = 26;
const PAD_Y = 31;
const COLS = 3;
const ROWS = 2;
const COL_GAP = 41;
const ROW_GAP = 61;
const COL_W = Math.floor((DEMO_SAFE_WIDTH - (PAD_X * 2) - (COL_GAP * (COLS - 1))) / COLS);
const ROW_H = Math.floor((DEMO_SAFE_HEIGHT - (PAD_Y * 2) - (ROW_GAP * (ROWS - 1))) / ROWS);

export function buildDemoScene(textures: DemoTextures): Container
{
    const root = new Container();

    root.label = 'demo';

    const sections = [
        buildContainersSection(),
        buildSpritesSection(textures),
        buildTextSection(),
        buildGraphicsSection(),
        buildMeshesSection(textures),
        buildSpecialSection(textures),
    ];

    for (let i = 0; i < sections.length; i++)
    {
        const section = sections[i];

        if (!section)
        {
            continue;
        }

        const col = i % COLS;
        const row = Math.floor(i / COLS);

        section.position.set(
            PAD_X + (col * (COL_W + COL_GAP)),
            PAD_Y + 20 + (row * (ROW_H + ROW_GAP)),
        );
        root.addChild(section);
    }

    return root;
}
