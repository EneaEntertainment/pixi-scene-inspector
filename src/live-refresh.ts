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

export function readLiveRefreshIntervalAttr(
    element: Element = document.documentElement,
): number | undefined
{
    const raw = element.getAttribute(LIVE_REFRESH_INTERVAL_ATTR);

    if (raw === null)
    {
        return undefined;
    }

    return normalizeLiveRefreshInterval(raw);
}

function writeLiveRefreshIntervalAttr(
    seconds: number,
    element: Element = document.documentElement,
)
{
    element.setAttribute(
        LIVE_REFRESH_INTERVAL_ATTR,
        String(normalizeLiveRefreshInterval(seconds)),
    );
}

export function publishLiveRefreshInterval(seconds: number)
{
    const next = normalizeLiveRefreshInterval(seconds);

    writeLiveRefreshIntervalAttr(next);
    window.dispatchEvent(new CustomEvent(LIVE_REFRESH_INTERVAL_EVENT, { detail: next }));
}

export function subscribeLiveRefreshInterval(
    listener: (seconds: number) => void,
): () => void
{
    const onEvent = (event: Event) =>
    {
        if (!(event instanceof CustomEvent))
        {
            return;
        }

        listener(normalizeLiveRefreshInterval(event.detail));
    };

    const observer = new MutationObserver(() =>
    {
        const next = readLiveRefreshIntervalAttr();

        if (next === undefined)
        {
            return;
        }

        listener(next);
    });

    window.addEventListener(LIVE_REFRESH_INTERVAL_EVENT, onEvent);
    observer.observe(document.documentElement, {
        attributes      : true,
        attributeFilter : [LIVE_REFRESH_INTERVAL_ATTR],
    });

    const initial = readLiveRefreshIntervalAttr();

    if (initial !== undefined)
    {
        listener(initial);
    }

    return () =>
    {
        window.removeEventListener(LIVE_REFRESH_INTERVAL_EVENT, onEvent);
        observer.disconnect();
    };
}
