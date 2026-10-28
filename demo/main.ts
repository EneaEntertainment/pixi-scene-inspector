import { Application } from 'pixi.js';
import { isEditableKeyTarget } from '../src/editable-keys';
import { DEFAULT_TOGGLE_HOTKEY, matchesHotkey } from '../src/hotkey';
import { installPixiSceneInspectorHotkey } from '../src/overlay';
import { buildDemoScene } from './scene';
import { DEMO_SAFE_HEIGHT, DEMO_SAFE_WIDTH } from './scene/layout';
import { createDemoTextures } from './textures';

function stretchCanvas(canvas: HTMLCanvasElement)
{
    const { clientWidth, clientHeight } = document.documentElement;
    const scale = Math.min(clientWidth / DEMO_SAFE_WIDTH, clientHeight / DEMO_SAFE_HEIGHT);

    canvas.style.width = `${Math.round(DEMO_SAFE_WIDTH * scale)}px`;
    canvas.style.height = `${Math.round(DEMO_SAFE_HEIGHT * scale)}px`;
}

function discardHintOnInspectorHotkey()
{
    window.addEventListener('keydown', (event) =>
    {
        if (!matchesHotkey(event, DEFAULT_TOGGLE_HOTKEY) || isEditableKeyTarget(event.target))
        {
            return;
        }

        document.getElementById('hint')?.remove();
    });
}

async function main()
{
    const gameRoot = document.getElementById('game');

    if (!gameRoot)
    {
        throw new Error('#game root missing');
    }

    const app = new Application();

    await app.init({
        width      : DEMO_SAFE_WIDTH,
        height     : DEMO_SAFE_HEIGHT,
        background : '#1a1f2b',
    });

    gameRoot.appendChild(app.canvas);
    stretchCanvas(app.canvas);
    window.addEventListener('resize', () => stretchCanvas(app.canvas));

    (globalThis as { __PIXI_APP__?: Application }).__PIXI_APP__ = app;

    const textures = createDemoTextures(app);
    const scene = buildDemoScene(textures);

    app.stage.label = 'stage';
    app.stage.addChild(scene);

    const installedByDemo = installPixiSceneInspectorHotkey({ height: '40%' });

    if (installedByDemo)
    {
        // eslint-disable-next-line no-console
        console.info(
            '[pixi-scene-inspector] no extension hotkey detected — installed Shift+` in-page',
        );
    }
    else
    {
        // eslint-disable-next-line no-console
        console.info(
            '[pixi-scene-inspector] extension (or prior install) already owns Shift+` — demo did not add another listener',
        );
    }

    discardHintOnInspectorHotkey();
}

void main();
