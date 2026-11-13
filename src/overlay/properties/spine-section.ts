import {
    spineAnimationNames,
    spineCanResume,
    spineCurrentSkinName,
    spinePause,
    spinePlay,
    spinePlaybackInfo,
    spineRelease,
    spineResume,
    spineSetLoop,
    spineSetSkin,
    spineSkinNames,
    spineStop,
} from '../../page-ops/spine';
import { typeNameOf } from '../../page-ops/types';
import { createFieldLabel, createFieldRoot } from '../fields/chrome';
import { createSection } from '../fields/section';
import {
    ANIMATION_SELECT_STYLE,
    createAnimationTransport,
    fillSelectOptions,
} from './animation-chrome';

import type { PixiNode } from '../../page-ops/pixi-node';

export type SpineSection = {
    root: HTMLElement;
    sync: (node: PixiNode | null) => void;
    destroy: () => void;
};

export function createSpineSection(): SpineSection
{
    const ui = createSection('Animation', true);
    const transport = createAnimationTransport();

    const skinRow = createFieldRoot();
    const skinLabel = createFieldLabel('skin');
    const skinSelect = document.createElement('select');

    Object.assign(skinSelect.style, ANIMATION_SELECT_STYLE);

    skinRow.style.display = 'none';

    skinSelect.setAttribute('aria-label', 'skin');

    skinSelect.addEventListener('keydown', (event) =>
    {
        if (event.key !== 'Escape')
        {
            return;
        }

        event.preventDefault();
        skinSelect.blur();
    });

    skinRow.append(skinLabel, skinSelect);

    ui.body.append(skinRow, transport.row, transport.controls);

    ui.root.style.display = 'none';

    let boundNode: PixiNode | null = null;
    let optionNames: Array<string> = [];
    let skinOptionNames: Array<string> = [];
    let selected = '';
    let selectedSkin = '';
    let playing = false;
    let paused = false;
    let loop = false;
    let loopSynced = false;

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

        const started = spinePlay(boundNode, selected, loop, onPlaybackComplete);

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

    function setSkinOptions(names: Array<string>)
    {
        const onlyDefault = names.length === 1 && names[0] === 'default';

        if (names.length === 0 || onlyDefault)
        {
            selectedSkin = '';
            skinOptionNames = [];

            skinSelect.replaceChildren();

            skinRow.style.display = 'none';

            return;
        }

        skinRow.style.display = 'flex';

        if (!names.includes(selectedSkin))
        {
            selectedSkin = names[0] ?? '';
        }

        fillSelectOptions(skinSelect, names, selectedSkin, skinOptionNames, (next) =>
        {
            skinOptionNames = next;
        });
    }

    function hide()
    {
        if (boundNode)
        {
            spineRelease(boundNode);

            boundNode = null;
        }

        playing = false;
        paused = false;
        loop = false;
        loopSynced = false;
        selected = '';
        selectedSkin = '';
        optionNames = [];
        skinOptionNames = [];
        skinRow.style.display = 'none';
        ui.root.style.display = 'none';

        renderControls();
    }

    function syncNode(node: PixiNode | null)
    {
        if (!node || typeNameOf(node) !== 'Spine')
        {
            hide();

            return;
        }

        const names = spineAnimationNames(node);

        if (names.length === 0)
        {
            hide();

            return;
        }

        if (node !== boundNode)
        {
            if (boundNode)
            {
                spineRelease(boundNode);
            }

            boundNode = node;
            playing = false;
            paused = false;
            loop = false;
            loopSynced = false;
            selected = '';
            selectedSkin = '';
        }

        const info = spinePlaybackInfo(node);
        const skinNames = spineSkinNames(node);
        const editingAnimation = document.activeElement === transport.select;
        const editingSkin = document.activeElement === skinSelect;

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

        if (!editingSkin)
        {
            const currentSkin = spineCurrentSkinName(node);

            if (currentSkin && skinNames.includes(currentSkin))
            {
                selectedSkin = currentSkin;
            }
            else if (!skinNames.includes(selectedSkin))
            {
                selectedSkin = skinNames[0] ?? '';
            }
        }

        playing = info.playing;
        paused = info.paused;

        if (!loopSynced)
        {
            loop = info.animationName ? info.loop : false;
            loopSynced = true;
        }

        ui.root.style.display = 'block';

        setSkinOptions(skinNames);
        setOptions(names);
        renderControls();
    }

    skinSelect.addEventListener('change', () =>
    {
        selectedSkin = skinSelect.value;

        if (boundNode)
        {
            spineSetSkin(boundNode, selectedSkin);
        }

        skinSelect.blur();
    });

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
            paused = spinePause(boundNode);
            playing = !paused;

            renderControls();

            return;
        }

        if (paused && spineCanResume(boundNode, selected) && spineResume(boundNode, loop))
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

        const stopped = spineStop(boundNode);

        playing = false;
        paused = stopped;

        renderControls();
    });

    transport.loopBtn.addEventListener('click', () =>
    {
        loop = !loop;

        if (boundNode)
        {
            spineSetLoop(boundNode, loop);
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
