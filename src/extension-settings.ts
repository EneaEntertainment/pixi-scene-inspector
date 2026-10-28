import { DEFAULT_TOGGLE_HOTKEY, type HotkeyChord, normalizeHotkeyChord } from './hotkey';

export const TOGGLE_HOTKEY_STORAGE_KEY = 'toggleHotkey';

export type ExtensionSettings = {
    toggleHotkey: HotkeyChord;
};

export function resolveToggleHotkey(raw: unknown): HotkeyChord
{
    return normalizeHotkeyChord(raw) ?? DEFAULT_TOGGLE_HOTKEY;
}

export async function readExtensionSettings(): Promise<ExtensionSettings>
{
    const result = await chrome.storage.sync.get(TOGGLE_HOTKEY_STORAGE_KEY);

    return {
        toggleHotkey: resolveToggleHotkey(result[TOGGLE_HOTKEY_STORAGE_KEY]),
    };
}

export async function writeToggleHotkey(chord: HotkeyChord): Promise<void>
{
    await chrome.storage.sync.set({ [TOGGLE_HOTKEY_STORAGE_KEY]: chord });
}
