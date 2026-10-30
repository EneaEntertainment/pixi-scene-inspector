import {
    readExtensionSettings,
    resetHighlightColors,
    writeHighlightColors,
    writeLiveRefreshInterval,
    writeToggleHotkey,
} from './extension-settings';
import { DEFAULT_HIGHLIGHT_COLORS, normalizeHighlightAlpha, normalizeHighlightColor } from './highlight-colors';
import { DEFAULT_TOGGLE_HOTKEY, formatHotkey, hotkeyFromKeyboardEvent } from './hotkey';
import {
    DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
    LIVE_REFRESH_INTERVAL_STEP,
    MAX_LIVE_REFRESH_INTERVAL_SEC,
    MIN_LIVE_REFRESH_INTERVAL_SEC,
    normalizeLiveRefreshInterval,
} from './live-refresh';

import type { HighlightColorSettings } from './highlight-colors';
import type { HotkeyChord } from './hotkey';

function requireInput(id: string): HTMLInputElement
{
    const el = document.getElementById(id);

    if (!(el instanceof HTMLInputElement))
    {
        throw new Error(`settings markup missing: #${id}`);
    }

    return el;
}

function requireButton(id: string): HTMLButtonElement
{
    const el = document.getElementById(id);

    if (!(el instanceof HTMLButtonElement))
    {
        throw new Error(`settings markup missing: #${id}`);
    }

    return el;
}

function requireHtmlElement(id: string): HTMLElement
{
    const el = document.getElementById(id);

    if (!(el instanceof HTMLElement))
    {
        throw new Error(`settings markup missing: #${id}`);
    }

    return el;
}

const shortcutInput = requireInput('shortcut');
const resetButton = requireButton('reset');
const liveRefreshInput = requireInput('live-refresh-interval');
const liveRefreshValue = requireHtmlElement('live-refresh-value');
const highlightFillInput = requireInput('highlight-fill');
const highlightStrokeInput = requireInput('highlight-stroke');
const highlightFillAlphaInput = requireInput('highlight-fill-alpha');
const highlightFillDragAlphaInput = requireInput('highlight-fill-drag-alpha');
const resetColorsButton = requireButton('reset-colors');

let current: HotkeyChord = DEFAULT_TOGGLE_HOTKEY;
let currentColors: HighlightColorSettings = { ...DEFAULT_HIGHLIGHT_COLORS };
let currentLiveRefresh = DEFAULT_LIVE_REFRESH_INTERVAL_SEC;
let recording = false;

liveRefreshInput.min = String(MIN_LIVE_REFRESH_INTERVAL_SEC);
liveRefreshInput.max = String(MAX_LIVE_REFRESH_INTERVAL_SEC);
liveRefreshInput.step = String(LIVE_REFRESH_INTERVAL_STEP);

function formatLiveRefreshLabel(seconds: number): string
{
    if (seconds <= 0)
    {
        return 'Off';
    }

    const rounded = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);

    return `${rounded} s`;
}

function renderChord(chord: HotkeyChord)
{
    current = chord;
    shortcutInput.value = formatHotkey(chord);
}

function renderColors(colors: HighlightColorSettings)
{
    currentColors = colors;
    highlightFillInput.value = colors.fill;
    highlightStrokeInput.value = colors.stroke;
    highlightFillAlphaInput.value = String(colors.fillAlpha);
    highlightFillDragAlphaInput.value = String(colors.fillDragAlpha);
}

function renderLiveRefresh(seconds: number)
{
    currentLiveRefresh = normalizeLiveRefreshInterval(seconds);
    liveRefreshInput.value = String(currentLiveRefresh);
    liveRefreshValue.textContent = formatLiveRefreshLabel(currentLiveRefresh);
}

function setRecording(next: boolean)
{
    recording = next;
    shortcutInput.dataset.recording = next ? 'true' : 'false';
    shortcutInput.placeholder = next ? 'Press shortcut…' : '';
}

async function saveChord(chord: HotkeyChord)
{
    await writeToggleHotkey(chord);

    renderChord(chord);
    setRecording(false);
}

async function saveColors(colors: HighlightColorSettings)
{
    await writeHighlightColors(colors);

    currentColors = colors;
}

async function saveLiveRefresh(seconds: number)
{
    const next = await writeLiveRefreshInterval(seconds);

    renderLiveRefresh(next);
}

shortcutInput.addEventListener('focus', () =>
{
    setRecording(true);
});

shortcutInput.addEventListener('blur', () =>
{
    if (recording)
    {
        setRecording(false);
        renderChord(current);
    }
});

shortcutInput.addEventListener('keydown', (event) =>
{
    if (!recording)
    {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape')
    {
        setRecording(false);
        shortcutInput.blur();
        renderChord(current);

        return;
    }

    const chord = hotkeyFromKeyboardEvent(event);

    if (!chord)
    {
        return;
    }

    void saveChord(chord).catch(() => undefined);
});

resetButton.addEventListener('click', () =>
{
    void saveChord(DEFAULT_TOGGLE_HOTKEY).catch(() => undefined);
});

function colorsFromInputs(): HighlightColorSettings
{
    return {
        fill          : normalizeHighlightColor(highlightFillInput.value, currentColors.fill),
        stroke        : normalizeHighlightColor(highlightStrokeInput.value, currentColors.stroke),
        fillAlpha     : normalizeHighlightAlpha(highlightFillAlphaInput.value, currentColors.fillAlpha),
        fillDragAlpha : normalizeHighlightAlpha(highlightFillDragAlphaInput.value, currentColors.fillDragAlpha),
    };
}

let colorSaveTimer = 0;

function commitColors()
{
    void saveColors(colorsFromInputs()).catch(() =>
    {
        renderColors(currentColors);
    });
}

function queueColorSave()
{
    if (colorSaveTimer !== 0)
    {
        window.clearTimeout(colorSaveTimer);
    }

    colorSaveTimer = window.setTimeout(() =>
    {
        colorSaveTimer = 0;

        commitColors();
    }, 150);
}

function flushColorSave()
{
    if (colorSaveTimer !== 0)
    {
        window.clearTimeout(colorSaveTimer);

        colorSaveTimer = 0;
    }

    commitColors();
}

highlightFillInput.addEventListener('input', queueColorSave);
highlightStrokeInput.addEventListener('input', queueColorSave);
highlightFillInput.addEventListener('change', flushColorSave);
highlightStrokeInput.addEventListener('change', flushColorSave);
highlightFillAlphaInput.addEventListener('change', flushColorSave);
highlightFillDragAlphaInput.addEventListener('change', flushColorSave);

liveRefreshInput.addEventListener('input', () =>
{
    const preview = normalizeLiveRefreshInterval(Number(liveRefreshInput.value));

    liveRefreshInput.value = String(preview);
    liveRefreshValue.textContent = formatLiveRefreshLabel(preview);
});

liveRefreshInput.addEventListener('change', () =>
{
    void saveLiveRefresh(Number(liveRefreshInput.value)).catch(() =>
    {
        renderLiveRefresh(currentLiveRefresh);
    });
});

resetColorsButton.addEventListener('click', () =>
{
    void resetHighlightColors()
        .then((colors) =>
        {
            renderColors(colors);
        })
        .catch(() => undefined);
});

void readExtensionSettings()
    .then((settings) =>
    {
        renderChord(settings.toggleHotkey);
        renderColors(settings.highlightColors);
        renderLiveRefresh(settings.liveRefreshInterval);
    })
    .catch(() =>
    {
        renderChord(DEFAULT_TOGGLE_HOTKEY);
        renderColors(DEFAULT_HIGHLIGHT_COLORS);
        renderLiveRefresh(DEFAULT_LIVE_REFRESH_INTERVAL_SEC);
    });
