import { Application, Cache } from 'pixi.js';
import { isEditableKeyTarget } from '../src/editable-keys';
import { DEFAULT_TOGGLE_HOTKEY, matchesHotkey } from '../src/hotkey';
import { installPixiSceneInspectorHotkey } from '../src/overlay';
import { buildThreeDDemoScene } from './scene';

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
        resizeTo    : gameRoot,
        background  : '#1a1a2e',
        antialias   : true,
        preference  : 'webgl',
        resolution  : Math.min(window.devicePixelRatio, 2),
        autoDensity : true,
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
