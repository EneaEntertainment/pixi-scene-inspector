import {
    readExtensionSettings,
    resolveLiveRefreshInterval,
    resolveToggleHotkey,
    TOGGLE_HOTKEY_STORAGE_KEY,
} from './extension-settings';
import {
    DEFAULT_HIGHLIGHT_COLORS,
    HIGHLIGHT_COLORS_STORAGE_KEY,
    HIGHLIGHT_FILL_STORAGE_KEY,
    HIGHLIGHT_STROKE_STORAGE_KEY,
    publishHighlightColors,
} from './highlight-colors';
import { DEFAULT_TOGGLE_HOTKEY, publishHotkeyConfig } from './hotkey';
import {
    DEFAULT_LIVE_REFRESH_INTERVAL_SEC,
    LIVE_REFRESH_INTERVAL_STORAGE_KEY,
    publishLiveRefreshInterval,
} from './live-refresh';

async function syncFromStorage()
{
    try
    {
        const settings = await readExtensionSettings();

        publishHotkeyConfig(settings.toggleHotkey);
        publishHighlightColors(settings.highlightColors);
        publishLiveRefreshInterval(settings.liveRefreshInterval);
    }
    catch
    {
        publishHotkeyConfig(DEFAULT_TOGGLE_HOTKEY);
        publishHighlightColors(DEFAULT_HIGHLIGHT_COLORS);
        publishLiveRefreshInterval(DEFAULT_LIVE_REFRESH_INTERVAL_SEC);
    }
}

void syncFromStorage();

chrome.storage.onChanged.addListener((changes, areaName) =>
{
    if (areaName !== 'sync')
    {
        return;
    }

    const hotkeyChange = changes[TOGGLE_HOTKEY_STORAGE_KEY];

    if (hotkeyChange)
    {
        publishHotkeyConfig(resolveToggleHotkey(hotkeyChange.newValue));
    }

    if (
        changes[HIGHLIGHT_COLORS_STORAGE_KEY]
        || changes[HIGHLIGHT_FILL_STORAGE_KEY]
        || changes[HIGHLIGHT_STROKE_STORAGE_KEY]
    )
    {
        void readExtensionSettings()
            .then((settings) =>
            {
                publishHighlightColors(settings.highlightColors);
            })
            .catch(() =>
            {
                publishHighlightColors(DEFAULT_HIGHLIGHT_COLORS);
            });
    }

    const liveRefreshChange = changes[LIVE_REFRESH_INTERVAL_STORAGE_KEY];

    if (liveRefreshChange)
    {
        publishLiveRefreshInterval(resolveLiveRefreshInterval(liveRefreshChange.newValue));
    }
});
