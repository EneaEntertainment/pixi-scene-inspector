import { PROPERTY_SECTION_IDS, type PropertyExportSectionId } from '../properties/catalog';

export type { PropertyExportSectionId };

export type PanelMode = 'docked' | 'floating';

type PanelPosition = {
    left: number;
    top: number;
};

type PanelSettings = {
    mode?: PanelMode;
    position?: PanelPosition;
    width?: number;
    height?: number;
};

export type PropertyExportSelection = Record<string, boolean>;

type PropertyExportSettings = Partial<
    Record<PropertyExportSectionId, PropertyExportSelection>
>;

export type PropertyExportOutputMode = 'json' | 'clipboard';

type SceneInspectorSettings = {
    properties?: PanelSettings;
    tree?: PanelSettings;
    propertyExport?: PropertyExportSettings;
    propertyExportOutput?: PropertyExportOutputMode;
};

export type FloatRectSettings = {
    left: number;
    top: number;
    width: number;
    height: number;
};

type PanelSettingsKey = 'properties' | 'tree';

const SETTINGS_KEY = 'pixi-scene-inspector-settings';

function asPositiveNumber(value: unknown): number | undefined
{
    const n = Number(value);

    return Number.isFinite(n) && n > 0 ? n : undefined;
}

function asFiniteNumber(value: unknown): number | undefined
{
    const n = Number(value);

    return Number.isFinite(n) ? n : undefined;
}

function normalizeMode(value: unknown): PanelMode | undefined
{
    return value === 'floating' || value === 'docked' ? value : undefined;
}

function normalizePropertyExportOutput(value: unknown): PropertyExportOutputMode | undefined
{
    return value === 'json' || value === 'clipboard' ? value : undefined;
}

function normalizePosition(raw: unknown): PanelPosition | undefined
{
    if (!raw || typeof raw !== 'object')
    {
        return undefined;
    }

    const record = raw as Record<string, unknown>;
    const left = asFiniteNumber(record.left);
    const top = asFiniteNumber(record.top);

    if (left === undefined || top === undefined)
    {
        return undefined;
    }

    return { left, top };
}

function normalizePanelSettings(raw: unknown): PanelSettings
{
    if (!raw || typeof raw !== 'object')
    {
        return {};
    }

    const record = raw as Record<string, unknown>;
    const settings: PanelSettings = {};
    const mode = normalizeMode(record.mode);
    const position = normalizePosition(record.position);
    const width = asPositiveNumber(record.width);
    const height = asPositiveNumber(record.height);

    if (mode !== undefined)
    {
        settings.mode = mode;
    }

    if (position !== undefined)
    {
        settings.position = position;
    }

    if (width !== undefined)
    {
        settings.width = width;
    }

    if (height !== undefined)
    {
        settings.height = height;
    }

    return settings;
}

function normalizePropertyExportSelection(raw: unknown): PropertyExportSelection | undefined
{
    if (!raw || typeof raw !== 'object')
    {
        return undefined;
    }

    const record = raw as Record<string, unknown>;
    const selection: PropertyExportSelection = {};

    for (const [key, value] of Object.entries(record))
    {
        if (typeof value === 'boolean')
        {
            selection[key] = value;
        }
    }

    return Object.keys(selection).length > 0 ? selection : undefined;
}

function normalizePropertyExport(raw: unknown): PropertyExportSettings | undefined
{
    if (!raw || typeof raw !== 'object')
    {
        return undefined;
    }

    const record = raw as Record<string, unknown>;
    const settings: PropertyExportSettings = {};

    for (const sectionId of PROPERTY_SECTION_IDS)
    {
        const selection = normalizePropertyExportSelection(record[sectionId]);

        if (selection)
        {
            settings[sectionId] = selection;
        }
    }

    return Object.keys(settings).length > 0 ? settings : undefined;
}

function mergePropertyExport(
    current: PropertyExportSettings | undefined,
    patch: PropertyExportSettings | undefined,
): PropertyExportSettings | undefined
{
    if (!current && !patch)
    {
        return undefined;
    }

    const next: PropertyExportSettings = {};

    for (const sectionId of PROPERTY_SECTION_IDS)
    {
        const selection = {
            ...current?.[sectionId],
            ...patch?.[sectionId],
        };

        if (Object.keys(selection).length > 0)
        {
            next[sectionId] = selection;
        }
    }

    return Object.keys(next).length > 0 ? next : undefined;
}

function normalizeSettings(raw: Record<string, unknown>): SceneInspectorSettings
{
    const settings: SceneInspectorSettings = {
        properties : normalizePanelSettings(raw.properties),
        tree       : normalizePanelSettings(raw.tree),
    };

    const propertyExport = normalizePropertyExport(raw.propertyExport);
    const propertyExportOutput = normalizePropertyExportOutput(
        raw.propertyExportOutput,
    );

    if (propertyExport)
    {
        settings.propertyExport = propertyExport;
    }

    if (propertyExportOutput)
    {
        settings.propertyExportOutput = propertyExportOutput;
    }

    return settings;
}

function roundPanelSettings(panel: PanelSettings): PanelSettings
{
    const rounded: PanelSettings = {};

    if (panel.mode === 'floating' || panel.mode === 'docked')
    {
        rounded.mode = panel.mode;
    }

    if (typeof panel.width === 'number' && Number.isFinite(panel.width))
    {
        rounded.width = Math.round(panel.width);
    }

    if (typeof panel.height === 'number' && Number.isFinite(panel.height))
    {
        rounded.height = Math.round(panel.height);
    }

    if (panel.position)
    {
        const left = panel.position.left;
        const top = panel.position.top;

        if (Number.isFinite(left) && Number.isFinite(top))
        {
            rounded.position = {
                left : Math.round(left),
                top  : Math.round(top),
            };
        }
    }

    return rounded;
}

function readSettings(): SceneInspectorSettings
{
    try
    {
        const raw = localStorage.getItem(SETTINGS_KEY);

        if (!raw)
        {
            return {};
        }

        return normalizeSettings(JSON.parse(raw) as Record<string, unknown>);
    }
    catch
    {
        return {};
    }
}

function writeSettings(patch: SceneInspectorSettings)
{
    const current = readSettings();

    const propertyExport = mergePropertyExport(
        current.propertyExport,
        patch.propertyExport,
    );

    const propertyExportOutput = patch.propertyExportOutput
        ?? current.propertyExportOutput;

    const next: SceneInspectorSettings = {
        properties: roundPanelSettings({
            ...current.properties,
            ...patch.properties,
            ...(patch.properties?.position
                ? {
                    position: {
                        ...current.properties?.position,
                        ...patch.properties.position,
                    },
                }
                : {}),
        }),
        tree: roundPanelSettings({
            ...current.tree,
            ...patch.tree,
            ...(patch.tree?.position
                ? {
                    position: {
                        ...current.tree?.position,
                        ...patch.tree.position,
                    },
                }
                : {}),
        }),
    };

    if (propertyExport)
    {
        next.propertyExport = propertyExport;
    }

    if (propertyExportOutput)
    {
        next.propertyExportOutput = propertyExportOutput;
    }

    try
    {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }
    catch
    {
        void 0;
    }
}

export function readPropertyExportSelection(sectionId: PropertyExportSectionId): PropertyExportSelection
{
    return readSettings().propertyExport?.[sectionId] ?? {};
}

export function writePropertyExportSelection(sectionId: PropertyExportSectionId, selection: PropertyExportSelection)
{
    writeSettings({
        propertyExport: {
            [sectionId]: selection,
        },
    });
}

export function readPropertyExportOutput(): PropertyExportOutputMode
{
    return readSettings().propertyExportOutput ?? 'json';
}

export function writePropertyExportOutput(mode: PropertyExportOutputMode)
{
    writeSettings({ propertyExportOutput: mode });
}

export function readPanelSettings(key: PanelSettingsKey): PanelSettings
{
    return readSettings()[key] ?? {};
}

export function writePanelSettings(key: PanelSettingsKey, patch: PanelSettings)
{
    writeSettings({ [key]: patch });
}

export function floatRectFromPanelSettings(settings: PanelSettings): FloatRectSettings | null
{
    const left = settings.position?.left;
    const top = settings.position?.top;
    const width = settings.width;
    const height = settings.height;

    if (
        left === undefined
        || top === undefined
        || width === undefined
        || height === undefined
    )
    {
        return null;
    }

    return { left, top, width, height };
}

export function writeFloatPanelSettings(key: PanelSettingsKey, rect: FloatRectSettings)
{
    writePanelSettings(key, {
        position : { left: rect.left, top: rect.top },
        width    : rect.width,
        height   : rect.height,
    });
}
