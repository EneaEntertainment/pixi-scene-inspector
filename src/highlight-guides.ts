import {
    createDocumentSettingChannel,
    parseJsonDocumentSetting,
} from './document-setting-channel';

export type HighlightGuidesSettings = {
    idle: boolean;
    drag: boolean;
};

export const DEFAULT_HIGHLIGHT_GUIDES: HighlightGuidesSettings = {
    idle : false,
    drag : true,
};

export const HIGHLIGHT_GUIDES_STORAGE_KEY = 'highlightGuides';
const HIGHLIGHT_GUIDES_EVENT = 'pixi-scene-inspector-highlight-guides';
const HIGHLIGHT_GUIDES_ATTR = 'data-psi-highlight-guides';

function asBoolean(raw: unknown, fallback: boolean): boolean
{
    return typeof raw === 'boolean' ? raw : fallback;
}

export function normalizeHighlightGuides(raw: unknown): HighlightGuidesSettings
{
    if (!raw || typeof raw !== 'object')
    {
        return { ...DEFAULT_HIGHLIGHT_GUIDES };
    }

    const record = raw as Record<string, unknown>;

    return {
        idle : asBoolean(record.idle, DEFAULT_HIGHLIGHT_GUIDES.idle),
        drag : asBoolean(record.drag, DEFAULT_HIGHLIGHT_GUIDES.drag),
    };
}

const channel = createDocumentSettingChannel<HighlightGuidesSettings>({
    attr      : HIGHLIGHT_GUIDES_ATTR,
    event     : HIGHLIGHT_GUIDES_EVENT,
    serialize : (value) => JSON.stringify(value),
    parse     : (raw) => parseJsonDocumentSetting(raw, normalizeHighlightGuides),
    normalize : normalizeHighlightGuides,
});

export const readHighlightGuidesAttr = channel.readAttr;
export const publishHighlightGuides = channel.publish;
export const subscribeHighlightGuides = channel.subscribe;
