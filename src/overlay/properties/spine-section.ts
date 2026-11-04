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
import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from '../fields/chrome';
import { createSection } from '../fields/section';
import { BUTTON_BG, LOOP_BG } from './constants';

import type { PixiNode } from '../../page-ops/pixi-node';

export type SpineSection = {
    root: HTMLElement;
    sync: (node: PixiNode | null) => void;
    destroy: () => void;
};

const SELECT_STYLE: Record<string, string> = {
    flex         : FIELD_CONTROL_FLEX,
    minWidth     : '0',
    height       : '22px',
    margin       : '0',
    padding      : '0 4px',
    border       : '0',
    borderRadius : '3px',
    outline      : 'none',
    background   : '#2a2a2a',
    color        : '#e5e5e5',
    font         : 'inherit',
    fontSize     : '12px',
    boxSizing    : 'border-box',
    cursor       : 'pointer',
};

function iconSvg(body: string): string
{
    return `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
}

function playIcon(): string
{
    return iconSvg('<path fill="currentColor" d="M5.2 3.1v9.8l8.1-4.9z"/>');
}

function pauseIcon(): string
{
    return iconSvg('<path fill="currentColor" d="M4.1 3.1h2.5v9.8H4.1zm5.3 0h2.5v9.8H9.4z"/>');
}

function stopIcon(): string
{
    return iconSvg('<rect x="4.1" y="4.1" width="7.8" height="7.8" rx="0.6" fill="currentColor"/>');
}

function loopIcon(): string
{
    return iconSvg(
        '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"'
        + ' stroke-linejoin="round"'
        + ' d="M11.5 2.4 14 4.4 11.5 6.4M2 7V6.4a2 2 0 0 1 2-2H14'
        + 'M4.5 13.6 2 11.6 4.5 9.6M14 9v.6a2 2 0 0 1-2 2H2"/>',
    );
}

function createIconButton(label: string, icon: string): HTMLButtonElement
{
    const button = document.createElement('button');

    button.type = 'button';
    button.innerHTML = icon;

    button.setAttribute('aria-label', label);

    Object.assign(button.style, {
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        width          : '28px',
        height         : '24px',
        margin         : '0',
        padding        : '0',
        border         : '0',
        borderRadius   : '4px',
        appearance     : 'none',
        background     : BUTTON_BG,
        color          : '#ffffff',
        cursor         : 'pointer',
        outline        : 'none',
        flexShrink     : '0',
        boxSizing      : 'border-box',
    });

    button.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        button.blur();
    });

    return button;
}

function sameNames(left: Array<string>, right: Array<string>): boolean
{
    if (left.length !== right.length)
    {
        return false;
    }

    for (let i = 0; i < left.length; i++)
    {
        if (left[i] !== right[i])
        {
            return false;
        }
    }

    return true;
}

export function createSpineSection(): SpineSection
{
    const ui = createSection('Animation', true);

    const skinRow = createFieldRoot();
    const skinLabel = createFieldLabel('skin');
    const skinSelect = document.createElement('select');

    Object.assign(skinSelect.style, SELECT_STYLE);

    skinRow.style.display = 'none';

    skinSelect.setAttribute('aria-label', 'skin');
    skinRow.append(skinLabel, skinSelect);

    const selectRow = createFieldRoot();
    const label = createFieldLabel('animation');
    const select = document.createElement('select');

    Object.assign(select.style, SELECT_STYLE);

    select.setAttribute('aria-label', 'animation');

    const controls = document.createElement('div');

    Object.assign(controls.style, {
        display        : 'flex',
        justifyContent : 'center',
        gap            : '6px',
    });

    const playBtn = createIconButton('Play animation', playIcon());
    const stopBtn = createIconButton('Stop animation', stopIcon());
    const loopBtn = createIconButton('Loop animation', loopIcon());

    controls.append(playBtn, stopBtn, loopBtn);
    selectRow.append(label, select);
    ui.body.append(skinRow, selectRow, controls);

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
    let shownPause = false;

    function renderControls()
    {
        if (shownPause !== playing)
        {
            shownPause = playing;
            playBtn.innerHTML = playing ? pauseIcon() : playIcon();
        }

        playBtn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
        loopBtn.style.background = loop ? LOOP_BG : BUTTON_BG;
        loopBtn.setAttribute('aria-pressed', loop ? 'true' : 'false');
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

    function fillSelect(
        selectEl: HTMLSelectElement,
        names: Array<string>,
        current: string,
        knownNames: Array<string>,
        assignKnown: (next: Array<string>) => void,
    )
    {
        if (sameNames(names, knownNames))
        {
            if (selectEl.value !== current && document.activeElement !== selectEl)
            {
                selectEl.value = current;
            }

            return;
        }

        assignKnown(names.slice());
        selectEl.replaceChildren();

        for (const name of names)
        {
            const option = document.createElement('option');

            option.value = name;
            option.textContent = name;

            selectEl.appendChild(option);
        }

        if (document.activeElement !== selectEl)
        {
            selectEl.value = current;
        }
    }

    function setOptions(names: Array<string>)
    {
        if (!names.includes(selected))
        {
            selected = names[0] ?? '';
        }

        fillSelect(select, names, selected, optionNames, (next) =>
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

        fillSelect(skinSelect, names, selectedSkin, skinOptionNames, (next) =>
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
        const editingAnimation = document.activeElement === select;
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

    select.addEventListener('change', () =>
    {
        selected = select.value;

        playSelected();
        select.blur();
    });

    playBtn.addEventListener('click', () =>
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

    stopBtn.addEventListener('click', () =>
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

    loopBtn.addEventListener('click', () =>
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
