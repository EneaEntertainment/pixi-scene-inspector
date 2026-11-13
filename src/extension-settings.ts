import {
    DEFAULT_HIGHLIGHT_COLORS,
    HIGHLIGHT_COLORS_STORAGE_KEY,
    HIGHLIGHT_FILL_STORAGE_KEY,
    HIGHLIGHT_STROKE_STORAGE_KEY,
    type HighlightColorSettings,
    normalizeHighlightColors,
} from './highlight-colors';
import {
    HIGHLIGHT_GUIDES_STORAGE_KEY,
    type HighlightGuidesSettings,
    normalizeHighlightGuides,
} from './highlight-guides';
import { DEFAULT_TOGGLE_HOTKEY, type HotkeyChord, normalizeHotkeyChord } from './hotkey';
import {
    DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
    LIVE_REFRESH_INTERVAL_STORAGE_KEY,
    normalizeLiveRefreshInterval,
} from './live-refresh';
import {
    DEFAULT_PICK_INCLUDE_HIDDEN,
    normalizePickIncludeHidden,
    PICK_INCLUDE_HIDDEN_STORAGE_KEY,
} from './pick-settings';

export const TOGGLE_HOTKEY_STORAGE_KEY = 'toggleHotkey';

export type ExtensionSettings = {
    toggleHotkey: HotkeyChord;
    highlightColors: HighlightColorSettings;
    highlightGuides: HighlightGuidesSettings;
    liveRefreshInterval: number;
    pickIncludeHidden: boolean;
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

export function resolvePickIncludeHidden(raw: unknown): boolean
{
    if (raw === undefined || raw === null)
    {
        return DEFAULT_PICK_INCLUDE_HIDDEN;
    }

    return normalizePickIncludeHidden(raw);
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
        HIGHLIGHT_GUIDES_STORAGE_KEY,
        LIVE_REFRESH_INTERVAL_STORAGE_KEY,
        PICK_INCLUDE_HIDDEN_STORAGE_KEY,
    ]);

    return {
        toggleHotkey        : resolveToggleHotkey(result[TOGGLE_HOTKEY_STORAGE_KEY]),
        highlightColors     : resolveStoredHighlightColors(result),
        highlightGuides     : normalizeHighlightGuides(result[HIGHLIGHT_GUIDES_STORAGE_KEY]),
        liveRefreshInterval : resolveLiveRefreshInterval(result[LIVE_REFRESH_INTERVAL_STORAGE_KEY]),
        pickIncludeHidden   : resolvePickIncludeHidden(result[PICK_INCLUDE_HIDDEN_STORAGE_KEY]),
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

export async function writeHighlightGuides(settings: HighlightGuidesSettings): Promise<HighlightGuidesSettings>
{
    const next = normalizeHighlightGuides(settings);

    await chrome.storage.sync.set({
        [HIGHLIGHT_GUIDES_STORAGE_KEY]: next,
    });

    return next;
}

export async function writePickIncludeHidden(value: boolean): Promise<boolean>
{
    const next = normalizePickIncludeHidden(value);

    await chrome.storage.sync.set({
        [PICK_INCLUDE_HIDDEN_STORAGE_KEY]: next,
    });

    return next;
}
