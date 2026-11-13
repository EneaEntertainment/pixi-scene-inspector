import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from '../fields/chrome';
import { BUTTON_BG, LOOP_BG } from './constants';

export const ANIMATION_SELECT_STYLE: Record<string, string> = {
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

export function playIcon(): string
{
    return iconSvg('<path fill="currentColor" d="M5.2 3.1v9.8l8.1-4.9z"/>');
}

export function pauseIcon(): string
{
    return iconSvg('<path fill="currentColor" d="M4.1 3.1h2.5v9.8H4.1zm5.3 0h2.5v9.8H9.4z"/>');
}

export function stopIcon(): string
{
    return iconSvg('<rect x="4.1" y="4.1" width="7.8" height="7.8" rx="0.6" fill="currentColor"/>');
}

export function loopIcon(): string
{
    return iconSvg(
        '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"'
        + ' stroke-linejoin="round"'
        + ' d="M11.5 2.4 14 4.4 11.5 6.4M2 7V6.4a2 2 0 0 1 2-2H14'
        + 'M4.5 13.6 2 11.6 4.5 9.6M14 9v.6a2 2 0 0 1-2 2H2"/>',
    );
}

export function createAnimationIconButton(label: string, icon: string): HTMLButtonElement
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

export function sameOptionNames(left: Array<string>, right: Array<string>): boolean
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

export function fillSelectOptions(
    selectEl: HTMLSelectElement,
    names: Array<string>,
    current: string,
    knownNames: Array<string>,
    assignKnown: (next: Array<string>) => void,
): void
{
    if (sameOptionNames(names, knownNames))
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

export type AnimationTransport = {
    row: HTMLElement;
    select: HTMLSelectElement;
    playBtn: HTMLButtonElement;
    stopBtn: HTMLButtonElement;
    loopBtn: HTMLButtonElement;
    controls: HTMLElement;
    renderControls: (state: { playing: boolean; loop: boolean }) => void;
};

export function createAnimationTransport(): AnimationTransport
{
    const row = createFieldRoot();
    const label = createFieldLabel('animation');
    const select = document.createElement('select');

    Object.assign(select.style, ANIMATION_SELECT_STYLE);
    select.setAttribute('aria-label', 'animation');

    select.addEventListener('keydown', (event) =>
    {
        if (event.key !== 'Escape')
        {
            return;
        }

        event.preventDefault();
        select.blur();
    });

    const controls = document.createElement('div');

    Object.assign(controls.style, {
        display        : 'flex',
        justifyContent : 'center',
        gap            : '6px',
    });

    const playBtn = createAnimationIconButton('Play animation', playIcon());
    const stopBtn = createAnimationIconButton('Stop animation', stopIcon());
    const loopBtn = createAnimationIconButton('Loop animation', loopIcon());

    controls.append(playBtn, stopBtn, loopBtn);
    row.append(label, select);

    let shownPause = false;

    function renderControls(state: { playing: boolean; loop: boolean })
    {
        if (shownPause !== state.playing)
        {
            shownPause = state.playing;
            playBtn.innerHTML = state.playing ? pauseIcon() : playIcon();
        }

        playBtn.setAttribute(
            'aria-label',
            state.playing ? 'Pause animation' : 'Play animation',
        );
        loopBtn.style.background = state.loop ? LOOP_BG : BUTTON_BG;
        loopBtn.setAttribute('aria-pressed', state.loop ? 'true' : 'false');
    }

    return {
        row,
        select,
        playBtn,
        stopBtn,
        loopBtn,
        controls,
        renderControls,
    };
}
