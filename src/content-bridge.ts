import { readExtensionSettings, resolveToggleHotkey, TOGGLE_HOTKEY_STORAGE_KEY } from './extension-settings';
import { DEFAULT_TOGGLE_HOTKEY, publishHotkeyConfig } from './hotkey';

async function syncFromStorage()
{
    try
    {
        const settings = await readExtensionSettings();

        publishHotkeyConfig(settings.toggleHotkey);
    }
    catch
    {
        publishHotkeyConfig(DEFAULT_TOGGLE_HOTKEY);
    }
}

void syncFromStorage();

chrome.storage.onChanged.addListener((changes, areaName) =>
{
    if (areaName !== 'sync')
    {
        return;
    }

    const change = changes[TOGGLE_HOTKEY_STORAGE_KEY];

    if (!change)
    {
        return;
    }

    publishHotkeyConfig(resolveToggleHotkey(change.newValue));
});
