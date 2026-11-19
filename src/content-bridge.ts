import { EXTENSION_SETTINGS_STORAGE_KEYS, syncExtensionSettingsToPage } from './extension-settings';

void syncExtensionSettingsToPage();

chrome.storage.onChanged.addListener((changes, areaName) =>
{
    if (areaName !== 'sync')
    {
        return;
    }

    const touched = EXTENSION_SETTINGS_STORAGE_KEYS.some((key) => key in changes);

    if (!touched)
    {
        return;
    }

    void syncExtensionSettingsToPage();
});
