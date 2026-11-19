import {
    DEFAULT_HIGHLIGHT_COLORS,
    HIGHLIGHT_COLORS_STORAGE_KEY,
    HIGHLIGHT_FILL_STORAGE_KEY,
    HIGHLIGHT_STROKE_STORAGE_KEY,
    normalizeHighlightColors,
} from './highlight-colors';
import { HIGHLIGHT_GUIDES_STORAGE_KEY, normalizeHighlightGuides } from './highlight-guides';
import {
    applyInspectorSettings,
    defaultInspectorSettings,
    parseInspectorSettingsRecord,
    resolveLiveRefreshInterval,
    resolvePickIncludeHidden,
    resolveToggleHotkey,
    TOGGLE_HOTKEY_STORAGE_KEY,
} from './inspector-settings';
import { LIVE_REFRESH_INTERVAL_STORAGE_KEY, normalizeLiveRefreshInterval } from './live-refresh';
import { normalizePickIncludeHidden, PICK_INCLUDE_HIDDEN_STORAGE_KEY } from './pick-settings';

import type { HighlightColorSettings } from './highlight-colors';
import type { HighlightGuidesSettings } from './highlight-guides';
import type { HotkeyChord } from './hotkey';
import type { InspectorSettings } from './inspector-settings';

export {
    resolveLiveRefreshInterval,
    resolvePickIncludeHidden,
    resolveToggleHotkey,
    TOGGLE_HOTKEY_STORAGE_KEY,
};

export type ExtensionSettings = InspectorSettings;

export const EXTENSION_SETTINGS_STORAGE_KEYS = [
    TOGGLE_HOTKEY_STORAGE_KEY,
    HIGHLIGHT_COLORS_STORAGE_KEY,
    HIGHLIGHT_FILL_STORAGE_KEY,
    HIGHLIGHT_STROKE_STORAGE_KEY,
    HIGHLIGHT_GUIDES_STORAGE_KEY,
    LIVE_REFRESH_INTERVAL_STORAGE_KEY,
    PICK_INCLUDE_HIDDEN_STORAGE_KEY,
] as const;

async function writeSync(payload: Record<string, unknown>): Promise<void>
{
    await chrome.storage.sync.set(payload);
}

export async function readExtensionSettings(): Promise<ExtensionSettings>
{
    const result = await chrome.storage.sync.get([...EXTENSION_SETTINGS_STORAGE_KEYS]);

    return parseInspectorSettingsRecord(result);
}

export async function writeToggleHotkey(chord: HotkeyChord): Promise<void>
{
    await writeSync({ [TOGGLE_HOTKEY_STORAGE_KEY]: resolveToggleHotkey(chord) });
}

export async function writeHighlightColors(colors: HighlightColorSettings): Promise<void>
{
    await writeSync({
        [HIGHLIGHT_COLORS_STORAGE_KEY]: normalizeHighlightColors(colors),
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

    await writeSync({
        [LIVE_REFRESH_INTERVAL_STORAGE_KEY]: next,
    });

    return next;
}

export async function writeHighlightGuides(settings: HighlightGuidesSettings): Promise<HighlightGuidesSettings>
{
    const next = normalizeHighlightGuides(settings);

    await writeSync({
        [HIGHLIGHT_GUIDES_STORAGE_KEY]: next,
    });

    return next;
}

export async function writePickIncludeHidden(value: boolean): Promise<boolean>
{
    const next = normalizePickIncludeHidden(value);

    await writeSync({
        [PICK_INCLUDE_HIDDEN_STORAGE_KEY]: next,
    });

    return next;
}

export async function syncExtensionSettingsToPage(): Promise<ExtensionSettings>
{
    try
    {
        return applyInspectorSettings(await readExtensionSettings());
    }
    catch
    {
        return applyInspectorSettings(defaultInspectorSettings());
    }
}
