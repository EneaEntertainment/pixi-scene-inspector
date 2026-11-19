import { Application, Cache } from 'pixi.js';
import { installPixiSceneInspectorHotkey } from 'pixi-scene-inspector';
import { discardHintOnInspectorHotkey } from '../demo/discard-hint-on-hotkey';
import { buildThreeDDemoScene } from './scene';

async function main()
{
    const gameRoot = document.getElementById('game');

    if (!gameRoot)
    {
        throw new Error('#game root missing');
    }

    const app = new Application();

    await app.init({
        resizeTo      : gameRoot,
        background    : '#1a1a2e',
        antialias     : true,
        preference    : 'webgl',
        useBackBuffer : true,
        resolution    : Math.min(window.devicePixelRatio, 2),
        autoDensity   : true,
    });

    gameRoot.appendChild(app.canvas);

    const globals = globalThis as typeof globalThis & {
        __PIXI_APP__?: Application;
        __PIXI_CACHE__?: typeof Cache;
    };

    globals.__PIXI_APP__ = app;
    globals.__PIXI_CACHE__ = Cache;

    app.stage.label = 'stage';

    await buildThreeDDemoScene(app);

    const installedByDemo = installPixiSceneInspectorHotkey();

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
