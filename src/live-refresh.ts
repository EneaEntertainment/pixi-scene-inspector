import { createDocumentSettingChannel } from './document-setting-channel';

export const DEFAULT_LIVE_REFRESH_INTERVAL_SEC = 1;
export const MIN_LIVE_REFRESH_INTERVAL_SEC = 0;
export const MAX_LIVE_REFRESH_INTERVAL_SEC = 10;
export const LIVE_REFRESH_INTERVAL_STEP = 0.5;

export const LIVE_REFRESH_INTERVAL_STORAGE_KEY = 'liveRefreshInterval';
export const LIVE_REFRESH_INTERVAL_EVENT = 'pixi-scene-inspector-live-refresh-interval';
export const LIVE_REFRESH_INTERVAL_ATTR = 'data-psi-live-refresh-interval';

export function normalizeLiveRefreshInterval(raw: unknown): number
{
    const value = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(value))
    {
        return DEFAULT_LIVE_REFRESH_INTERVAL_SEC;
    }

    const clamped = Math.min(
        MAX_LIVE_REFRESH_INTERVAL_SEC,
        Math.max(MIN_LIVE_REFRESH_INTERVAL_SEC, value),
    );

    return Math.round(clamped / LIVE_REFRESH_INTERVAL_STEP) * LIVE_REFRESH_INTERVAL_STEP;
}

const channel = createDocumentSettingChannel<number>({
    attr      : LIVE_REFRESH_INTERVAL_ATTR,
    event     : LIVE_REFRESH_INTERVAL_EVENT,
    serialize : (value) => String(value),
    parse     : (raw) => normalizeLiveRefreshInterval(raw),
    normalize : normalizeLiveRefreshInterval,
});

export const readLiveRefreshIntervalAttr = channel.readAttr;
export const publishLiveRefreshInterval = channel.publish;
export const subscribeLiveRefreshInterval = channel.subscribe;
