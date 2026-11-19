import {
    DEFAULT_HIGHLIGHT_COLORS,
    HIGHLIGHT_COLORS_STORAGE_KEY,
    HIGHLIGHT_FILL_STORAGE_KEY,
    HIGHLIGHT_STROKE_STORAGE_KEY,
    normalizeHighlightColors,
    publishHighlightColors,
    readHighlightColorsAttr,
} from './highlight-colors';
import {
    DEFAULT_HIGHLIGHT_GUIDES,
    HIGHLIGHT_GUIDES_STORAGE_KEY,
    normalizeHighlightGuides,
    publishHighlightGuides,
    readHighlightGuidesAttr,
} from './highlight-guides';
import {
    DEFAULT_TOGGLE_HOTKEY,
    normalizeHotkeyChord,
    publishHotkeyConfig,
    readHotkeyAttr,
} from './hotkey';
import {
    DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
    LIVE_REFRESH_INTERVAL_STORAGE_KEY,
    normalizeLiveRefreshInterval,
    publishLiveRefreshInterval,
    readLiveRefreshIntervalAttr,
} from './live-refresh';
import {
    DEFAULT_PICK_INCLUDE_HIDDEN,
    normalizePickIncludeHidden,
    PICK_INCLUDE_HIDDEN_STORAGE_KEY,
    publishPickIncludeHidden,
    readPickIncludeHiddenAttr,
} from './pick-settings';

import type { HighlightColorSettings } from './highlight-colors';
import type { HighlightGuidesSettings } from './highlight-guides';
import type { HotkeyChord } from './hotkey';

export const TOGGLE_HOTKEY_STORAGE_KEY = 'toggleHotkey';

export type InspectorSettings = {
    toggleHotkey: HotkeyChord;
    highlightColors: HighlightColorSettings;
    highlightGuides: HighlightGuidesSettings;
    liveRefreshInterval: number;
    pickIncludeHidden: boolean;
};

export type InspectorSettingsInput = Partial<InspectorSettings>;

export function defaultInspectorSettings(): InspectorSettings
{
    return {
        toggleHotkey        : { ...DEFAULT_TOGGLE_HOTKEY },
        highlightColors     : { ...DEFAULT_HIGHLIGHT_COLORS },
        highlightGuides     : { ...DEFAULT_HIGHLIGHT_GUIDES },
        liveRefreshInterval : DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
        pickIncludeHidden   : DEFAULT_PICK_INCLUDE_HIDDEN,
    };
}

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

export function parseInspectorSettingsRecord(result: Record<string, unknown>): InspectorSettings
{
    return {
        toggleHotkey        : resolveToggleHotkey(result[TOGGLE_HOTKEY_STORAGE_KEY]),
        highlightColors     : resolveStoredHighlightColors(result),
        highlightGuides     : normalizeHighlightGuides(result[HIGHLIGHT_GUIDES_STORAGE_KEY]),
        liveRefreshInterval : resolveLiveRefreshInterval(result[LIVE_REFRESH_INTERVAL_STORAGE_KEY]),
        pickIncludeHidden   : resolvePickIncludeHidden(result[PICK_INCLUDE_HIDDEN_STORAGE_KEY]),
    };
}

export function normalizeInspectorSettings(raw: unknown): InspectorSettings
{
    if (!raw || typeof raw !== 'object')
    {
        return defaultInspectorSettings();
    }

    return parseInspectorSettingsRecord(raw as Record<string, unknown>);
}

export function mergeInspectorSettings(base: InspectorSettings, partial?: InspectorSettingsInput): InspectorSettings
{
    if (!partial)
    {
        return {
            toggleHotkey        : { ...base.toggleHotkey },
            highlightColors     : { ...base.highlightColors },
            highlightGuides     : { ...base.highlightGuides },
            liveRefreshInterval : base.liveRefreshInterval,
            pickIncludeHidden   : base.pickIncludeHidden,
        };
    }

    return {
        toggleHotkey: partial.toggleHotkey === undefined
            ? { ...base.toggleHotkey }
            : resolveToggleHotkey(partial.toggleHotkey),
        highlightColors: partial.highlightColors === undefined
            ? { ...base.highlightColors }
            : normalizeHighlightColors(partial.highlightColors),
        highlightGuides: partial.highlightGuides === undefined
            ? { ...base.highlightGuides }
            : normalizeHighlightGuides(partial.highlightGuides),
        liveRefreshInterval: partial.liveRefreshInterval === undefined
            ? base.liveRefreshInterval
            : resolveLiveRefreshInterval(partial.liveRefreshInterval),
        pickIncludeHidden: partial.pickIncludeHidden === undefined
            ? base.pickIncludeHidden
            : resolvePickIncludeHidden(partial.pickIncludeHidden),
    };
}

export function applyInspectorSettings(settings: InspectorSettings): InspectorSettings
{
    const next = mergeInspectorSettings(settings);

    publishHotkeyConfig(next.toggleHotkey);
    publishHighlightColors(next.highlightColors);
    publishHighlightGuides(next.highlightGuides);
    publishLiveRefreshInterval(next.liveRefreshInterval);
    publishPickIncludeHidden(next.pickIncludeHidden);

    return next;
}

export function readLiveInspectorSettings(): InspectorSettings
{
    const defaults = defaultInspectorSettings();

    return {
        toggleHotkey        : readHotkeyAttr() ?? defaults.toggleHotkey,
        highlightColors     : readHighlightColorsAttr() ?? defaults.highlightColors,
        highlightGuides     : readHighlightGuidesAttr() ?? defaults.highlightGuides,
        liveRefreshInterval : readLiveRefreshIntervalAttr() ?? defaults.liveRefreshInterval,
        pickIncludeHidden   : readPickIncludeHiddenAttr() ?? defaults.pickIncludeHidden,
    };
}
