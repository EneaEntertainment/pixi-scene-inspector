import {
    DEFAULT_HIGHLIGHT_COLORS,
    HIGHLIGHT_COLORS_STORAGE_KEY,
    HIGHLIGHT_FILL_STORAGE_KEY,
    HIGHLIGHT_STROKE_STORAGE_KEY,
    type HighlightColorSettings,
    normalizeHighlightColors,
} from './highlight-colors';
import { DEFAULT_TOGGLE_HOTKEY, type HotkeyChord, normalizeHotkeyChord } from './hotkey';
import {
    DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
    LIVE_REFRESH_INTERVAL_STORAGE_KEY,
    normalizeLiveRefreshInterval,
} from './live-refresh';

export const TOGGLE_HOTKEY_STORAGE_KEY = 'toggleHotkey';

export type ExtensionSettings = {
    toggleHotkey: HotkeyChord;
    highlightColors: HighlightColorSettings;
    liveRefreshInterval: number;
};

export function resolveToggleHotkey(raw: unknown): HotkeyChord
{
    return normalizeHotkeyChord(raw) ?? DEFAULT_TOGGLE_HOTKEY;
}

export function resolveLiveRefreshInterval(raw: unknown): number
{
    if (raw === undefined || raw === null)
    {
        return DEFAULT_LIVE_REFRESH_INTERVAL_SEC;
    }

    return normalizeLiveRefreshInterval(raw);
}

function resolveStoredHighlightColors(result: Record<string, unknown>): HighlightColorSettings
{
    const stored = result[HIGHLIGHT_COLORS_STORAGE_KEY];

    if (stored && typeof stored === 'object')
    {
        return normalizeHighlightColors(stored);
    }

    return normalizeHighlightColors({
        fill   : result[HIGHLIGHT_FILL_STORAGE_KEY],
        stroke : result[HIGHLIGHT_STROKE_STORAGE_KEY],
    });
}

export async function readExtensionSettings(): Promise<ExtensionSettings>
{
    const result = await chrome.storage.sync.get([
        TOGGLE_HOTKEY_STORAGE_KEY,
        HIGHLIGHT_COLORS_STORAGE_KEY,
        HIGHLIGHT_FILL_STORAGE_KEY,
        HIGHLIGHT_STROKE_STORAGE_KEY,
        LIVE_REFRESH_INTERVAL_STORAGE_KEY,
    ]);

    return {
        toggleHotkey        : resolveToggleHotkey(result[TOGGLE_HOTKEY_STORAGE_KEY]),
        highlightColors     : resolveStoredHighlightColors(result),
        liveRefreshInterval : resolveLiveRefreshInterval(result[LIVE_REFRESH_INTERVAL_STORAGE_KEY]),
    };
}

export async function writeToggleHotkey(chord: HotkeyChord): Promise<void>
{
    await chrome.storage.sync.set({ [TOGGLE_HOTKEY_STORAGE_KEY]: chord });
}

export async function writeHighlightColors(colors: HighlightColorSettings): Promise<void>
{
    const next = normalizeHighlightColors(colors);

    await chrome.storage.sync.set({
        [HIGHLIGHT_COLORS_STORAGE_KEY]: next,
    });
}

export async function resetHighlightColors(): Promise<HighlightColorSettings>
{
    const next = { ...DEFAULT_HIGHLIGHT_COLORS };

    await writeHighlightColors(next);

    return next;
}

export async function writeLiveRefreshInterval(seconds: number): Promise<number>
{
    const next = normalizeLiveRefreshInterval(seconds);

    await chrome.storage.sync.set({
        [LIVE_REFRESH_INTERVAL_STORAGE_KEY]: next,
    });

    return next;
}
