import {
    model3dAnimationNames,
    model3dCanResume,
    model3dPause,
    model3dPlay,
    model3dPlaybackInfo,
    model3dRelease,
    model3dResume,
    model3dSetAnimationSelection,
    model3dSetLoop,
    model3dStop,
    resolveModel3DPlayerHost,
} from '../../page-ops/model-3d';
import { createSection } from '../fields/section';
import {
    createAnimationTransport,
    fillSelectOptions,
} from './animation-chrome';

import type { PixiNode } from '../../page-ops/pixi-node';

export type Model3DSection = {
    root: HTMLElement;
    sync: (node: PixiNode | null) => void;
    destroy: () => void;
};

export function createModel3DSection(onExportClick: () => void): Model3DSection
{
    const ui = createSection('Animation', true, onExportClick);
    const transport = createAnimationTransport();

    ui.body.append(transport.row, transport.controls);

    ui.root.style.display = 'none';

    let boundNode: PixiNode | null = null;
    let optionNames: Array<string> = [];
    let selected = '';
    let playing = false;
    let paused = false;
    let loop = true;
    let loopSynced = false;

    function rememberSelection()
    {
        if (!boundNode || selected === '')
        {
            return;
        }

        model3dSetAnimationSelection(boundNode, selected, loop);
    }

    function renderControls()
    {
        transport.renderControls({ playing, loop });
    }

    function onPlaybackComplete()
    {
        playing = false;
        paused = false;

        renderControls();
    }

    function playSelected()
    {
        if (!boundNode)
        {
            return;
        }

        rememberSelection();

        const started = model3dPlay(boundNode, selected, loop, onPlaybackComplete);

        playing = started;
        paused = false;

        renderControls();
    }

    function setOptions(names: Array<string>)
    {
        if (!names.includes(selected))
        {
            selected = names[0] ?? '';
        }

        fillSelectOptions(transport.select, names, selected, optionNames, (next) =>
        {
            optionNames = next;
        });
    }

    function hide()
    {
        if (boundNode)
        {
            model3dRelease(boundNode);

            boundNode = null;
        }

        playing = false;
        paused = false;
        loop = true;
        loopSynced = false;
        selected = '';
        optionNames = [];
        ui.root.style.display = 'none';

        renderControls();
    }

    function syncNode(node: PixiNode | null)
    {
        const host = resolveModel3DPlayerHost(node);

        if (!host)
        {
            hide();

            return;
        }

        const names = model3dAnimationNames(host);

        if (names.length === 0)
        {
            hide();

            return;
        }

        if (host !== boundNode)
        {
            if (boundNode)
            {
                model3dRelease(boundNode);
            }

            boundNode = host;
            playing = false;
            paused = false;
            loop = true;
            loopSynced = false;
            selected = '';
        }

        const info = model3dPlaybackInfo(host);
        const editingAnimation = document.activeElement === transport.select;

        if (!editingAnimation)
        {
            if (info.animationName && names.includes(info.animationName))
            {
                selected = info.animationName;
            }
            else if (!names.includes(selected))
            {
                selected = names[0] ?? '';
            }
        }

        playing = info.playing;
        paused = info.paused;

        if (!loopSynced)
        {
            loop = info.animationName ? info.loop : true;
            loopSynced = true;
        }

        rememberSelection();

        ui.root.style.display = 'block';

        setOptions(names);
        renderControls();
    }

    transport.select.addEventListener('change', () =>
    {
        selected = transport.select.value;

        playSelected();
        transport.select.blur();
    });

    transport.playBtn.addEventListener('click', () =>
    {
        if (!boundNode)
        {
            return;
        }

        if (playing)
        {
            paused = model3dPause(boundNode);
            playing = !paused;

            renderControls();

            return;
        }

        if (paused && model3dCanResume(boundNode, selected) && model3dResume(boundNode, loop))
        {
            playing = true;
            paused = false;

            renderControls();

            return;
        }

        playSelected();
    });

    transport.stopBtn.addEventListener('click', () =>
    {
        if (!boundNode)
        {
            return;
        }

        const stopped = model3dStop(boundNode);

        playing = false;
        paused = stopped;

        renderControls();
    });

    transport.loopBtn.addEventListener('click', () =>
    {
        loop = !loop;

        rememberSelection();

        if (boundNode)
        {
            model3dSetLoop(boundNode, loop);
        }

        renderControls();
    });

    renderControls();

    return {
        root: ui.root,

        sync: (node) =>
        {
            try
            {
                syncNode(node);
            }
            catch
            {
                hide();
            }
        },

        destroy: () =>
        {
            hide();
            ui.root.remove();
        },
    };
}
