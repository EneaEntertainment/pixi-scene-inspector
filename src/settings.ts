import { readExtensionSettings, writeToggleHotkey } from './extension-settings';
import { DEFAULT_TOGGLE_HOTKEY, formatHotkey, hotkeyFromKeyboardEvent } from './hotkey';

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
const statusEl = requireHtmlElement('status');

let current: HotkeyChord = DEFAULT_TOGGLE_HOTKEY;
let recording = false;

function setStatus(message: string, tone: 'info' | 'error' = 'info')
{
    statusEl.textContent = message;
    statusEl.dataset.tone = tone === 'error' ? 'error' : '';
}

function renderChord(chord: HotkeyChord)
{
    current = chord;
    shortcutInput.value = formatHotkey(chord);
}

function setRecording(next: boolean)
{
    recording = next;
    shortcutInput.dataset.recording = next ? 'true' : 'false';
    shortcutInput.placeholder = next ? 'Press shortcut…' : '';

    if (next)
    {
        setStatus('Listening for a shortcut…');
    }
}

async function saveChord(chord: HotkeyChord)
{
    await writeToggleHotkey(chord);
    renderChord(chord);
    setRecording(false);
    setStatus(`Saved ${formatHotkey(chord)}`);
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
        setStatus('');
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
        setStatus('Cancelled');
        renderChord(current);

        return;
    }

    const chord = hotkeyFromKeyboardEvent(event);

    if (!chord)
    {
        setStatus('Include a modifier (Shift, Ctrl, Alt, or ⌘)', 'error');

        return;
    }

    void saveChord(chord).catch(() =>
    {
        setStatus('Could not save shortcut', 'error');
    });
});

resetButton.addEventListener('click', () =>
{
    void saveChord(DEFAULT_TOGGLE_HOTKEY).catch(() =>
    {
        setStatus('Could not reset shortcut', 'error');
    });
});

void readExtensionSettings()
    .then((settings) =>
    {
        renderChord(settings.toggleHotkey);
        setStatus(`Default is ${formatHotkey(DEFAULT_TOGGLE_HOTKEY)}`);
    })
    .catch(() =>
    {
        renderChord(DEFAULT_TOGGLE_HOTKEY);
        setStatus('Using default shortcut', 'error');
    });
