import {
    applyInspectorSettings,
    mergeInspectorSettings,
    normalizeInspectorSettings,
    readLiveInspectorSettings,
} from './inspector-settings';

import type {
    InspectorSettings,
    InspectorSettingsInput,
} from './inspector-settings';

export const PAGE_INSPECTOR_SETTINGS_KEY = 'pixi-scene-inspector-config';

export type ConfigurePixiSceneInspectorSettingsOptions = {
    persist?: boolean;
};

function readStoredInspectorSettings(): InspectorSettings | undefined
{
    try
    {
        const raw = localStorage.getItem(PAGE_INSPECTOR_SETTINGS_KEY);

        if (raw === null)
        {
            return undefined;
        }

        return normalizeInspectorSettings(JSON.parse(raw) as unknown);
    }
    catch
    {
        return undefined;
    }
}

function writeStoredInspectorSettings(settings: InspectorSettings): void
{
    try
    {
        localStorage.setItem(PAGE_INSPECTOR_SETTINGS_KEY, JSON.stringify(settings));
    }
    catch
    {
        return;
    }
}

export function getPixiSceneInspectorSettings(): InspectorSettings
{
    return readLiveInspectorSettings();
}

export function configurePixiSceneInspectorSettings(
    partial?: InspectorSettingsInput,
    options?: ConfigurePixiSceneInspectorSettingsOptions,
): InspectorSettings
{
    const persist = options?.persist !== false;
    const base = readStoredInspectorSettings() ?? readLiveInspectorSettings();
    const next = applyInspectorSettings(mergeInspectorSettings(base, partial));

    if (persist)
    {
        writeStoredInspectorSettings(next);
    }

    return next;
}

export function hydratePixiSceneInspectorSettingsFromPageStore(): InspectorSettings | null
{
    const stored = readStoredInspectorSettings();

    if (!stored)
    {
        return null;
    }

    return applyInspectorSettings(stored);
}

export function applyPixiSceneInspectorMountSettings(settings?: InspectorSettingsInput): void
{
    if (settings)
    {
        configurePixiSceneInspectorSettings(settings);

        return;
    }

    hydratePixiSceneInspectorSettingsFromPageStore();
}
