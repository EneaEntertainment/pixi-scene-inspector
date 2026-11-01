import { Assets } from 'pixi.js';
import { labeledSection } from './layout';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

import type { Container } from 'pixi.js';

const SPINEBOY_BASE = `${import.meta.env.BASE_URL}spineboy/`;
const SPINEBOY_SKELETON = 'demoSpineboyData';
const SPINEBOY_ATLAS = 'demoSpineboyAtlas';

let spineboyAssetsLoaded = false;

async function ensureSpineboyAssets(): Promise<void>
{
    if (spineboyAssetsLoaded)
    {
        return;
    }

    Assets.add({ alias: SPINEBOY_SKELETON, src: `${SPINEBOY_BASE}spineboy-pro.skel` });
    Assets.add({ alias: SPINEBOY_ATLAS, src: `${SPINEBOY_BASE}spineboy-pma.atlas` });

    await Assets.load([SPINEBOY_SKELETON, SPINEBOY_ATLAS]);

    spineboyAssetsLoaded = true;
}

export async function buildSpineSection(): Promise<Container>
{
    await ensureSpineboyAssets();

    const section = labeledSection('spine');

    const spineboy = new Spine({
        skeleton : SPINEBOY_SKELETON,
        atlas    : SPINEBOY_ATLAS,
        scale    : 0.22,
    });

    spineboy.label = 'Spineboy';

    spineboy.state.setAnimation(0, 'walk', true);
    spineboy.position.set(70, 150);

    section.addChild(spineboy);

    return section;
}
