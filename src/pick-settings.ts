import { createDocumentSettingChannel } from './document-setting-channel';

export const DEFAULT_PICK_INCLUDE_HIDDEN = false;
export const PICK_INCLUDE_HIDDEN_STORAGE_KEY = 'pickIncludeHidden';

const PICK_INCLUDE_HIDDEN_EVENT = 'pixi-scene-inspector-pick-include-hidden';
const PICK_INCLUDE_HIDDEN_ATTR = 'data-psi-pick-include-hidden';

const channel = createDocumentSettingChannel<boolean>({
    attr      : PICK_INCLUDE_HIDDEN_ATTR,
    event     : PICK_INCLUDE_HIDDEN_EVENT,
    serialize : (value) => (value ? '1' : '0'),
    parse     : (raw) => raw === '1' || raw === 'true',
    normalize : normalizePickIncludeHidden,
});

export const readPickIncludeHiddenAttr = channel.readAttr;
export const publishPickIncludeHidden = channel.publish;
export const subscribePickIncludeHidden = channel.subscribe;

export function normalizePickIncludeHidden(raw: unknown): boolean
{
    return raw === true;
}
