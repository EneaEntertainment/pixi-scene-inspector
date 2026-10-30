export type HighlightColorSettings = {
    fill: string;
    stroke: string;
    fillAlpha: number;
    fillDragAlpha: number;
};

const DEFAULT_HIGHLIGHT_FILL = '#408cff';
const DEFAULT_HIGHLIGHT_STROKE = '#2878ff';
const DEFAULT_FILL_ALPHA = 0.35;
const DEFAULT_FILL_DRAG_ALPHA = 0.1;

const STROKE_ALPHA = 1;
const STROKE_DRAG_ALPHA = 0.5;

export const DEFAULT_HIGHLIGHT_COLORS: HighlightColorSettings = {
    fill          : DEFAULT_HIGHLIGHT_FILL,
    stroke        : DEFAULT_HIGHLIGHT_STROKE,
    fillAlpha     : DEFAULT_FILL_ALPHA,
    fillDragAlpha : DEFAULT_FILL_DRAG_ALPHA,
};

export const HIGHLIGHT_COLORS_STORAGE_KEY = 'highlightColors';
export const HIGHLIGHT_FILL_STORAGE_KEY = 'highlightFill';
export const HIGHLIGHT_STROKE_STORAGE_KEY = 'highlightStroke';

export const HIGHLIGHT_COLORS_EVENT = 'pixi-scene-inspector-highlight-colors';
export const HIGHLIGHT_COLORS_ATTR = 'data-psi-highlight-colors';

export const MARK_FILL = 'rgba(255, 255, 255, 1)';

let current: HighlightColorSettings = { ...DEFAULT_HIGHLIGHT_COLORS };

function parseHex6(raw: string): string | undefined
{
    const match = (/^#?([0-9a-f]{6})$/i).exec(raw.trim());

    if (!match)
    {
        return undefined;
    }

    return `#${match[1].toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number }
{
    const normalized = parseHex6(hex) ?? DEFAULT_HIGHLIGHT_FILL;
    const value = Number.parseInt(normalized.slice(1), 16);

    return {
        r : (value >> 16) & 255,
        g : (value >> 8) & 255,
        b : value & 255,
    };
}

function rgbaFromHex(hex: string, alpha: number): string
{
    const { r, g, b } = hexToRgb(hex);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeHighlightColor(raw: unknown, fallback: string): string
{
    if (typeof raw !== 'string')
    {
        return fallback;
    }

    return parseHex6(raw) ?? fallback;
}

export function normalizeHighlightAlpha(raw: unknown, fallback: number): number
{
    const value = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(value))
    {
        return fallback;
    }

    return Math.min(1, Math.max(0, value));
}

export function normalizeHighlightColors(raw: unknown): HighlightColorSettings
{
    if (!raw || typeof raw !== 'object')
    {
        return { ...DEFAULT_HIGHLIGHT_COLORS };
    }

    const record = raw as Record<string, unknown>;

    return {
        fill          : normalizeHighlightColor(record.fill, DEFAULT_HIGHLIGHT_FILL),
        stroke        : normalizeHighlightColor(record.stroke, DEFAULT_HIGHLIGHT_STROKE),
        fillAlpha     : normalizeHighlightAlpha(record.fillAlpha, DEFAULT_FILL_ALPHA),
        fillDragAlpha : normalizeHighlightAlpha(record.fillDragAlpha, DEFAULT_FILL_DRAG_ALPHA),
    };
}

export function highlightFill(): string
{
    return rgbaFromHex(current.fill, current.fillAlpha);
}

export function highlightFillDrag(): string
{
    return rgbaFromHex(current.fill, current.fillDragAlpha);
}

export function highlightStroke(): string
{
    return rgbaFromHex(current.stroke, STROKE_ALPHA);
}

export function highlightStrokeDrag(): string
{
    return rgbaFromHex(current.stroke, STROKE_DRAG_ALPHA);
}

function setHighlightColors(colors: HighlightColorSettings)
{
    current = normalizeHighlightColors(colors);
}

function readHighlightColorsAttr(element: Element = document.documentElement): HighlightColorSettings | undefined
{
    const raw = element.getAttribute(HIGHLIGHT_COLORS_ATTR);

    if (!raw)
    {
        return undefined;
    }

    try
    {
        return normalizeHighlightColors(JSON.parse(raw) as unknown);
    }
    catch
    {
        return undefined;
    }
}

function writeHighlightColorsAttr(colors: HighlightColorSettings, element: Element = document.documentElement)
{
    element.setAttribute(HIGHLIGHT_COLORS_ATTR, JSON.stringify(colors));
}

export function publishHighlightColors(colors: HighlightColorSettings)
{
    const next = normalizeHighlightColors(colors);

    setHighlightColors(next);
    writeHighlightColorsAttr(next);

    window.dispatchEvent(new CustomEvent(HIGHLIGHT_COLORS_EVENT, { detail: next }));
}

export function subscribeHighlightColors(listener: (colors: HighlightColorSettings) => void): () => void
{
    const onEvent = (event: Event) =>
    {
        if (!(event instanceof CustomEvent))
        {
            return;
        }

        const next = normalizeHighlightColors(event.detail);

        setHighlightColors(next);
        listener(next);
    };

    const observer = new MutationObserver(() =>
    {
        const next = readHighlightColorsAttr();

        if (!next)
        {
            return;
        }

        setHighlightColors(next);
        listener(next);
    });

    window.addEventListener(HIGHLIGHT_COLORS_EVENT, onEvent);

    observer.observe(document.documentElement, {
        attributes      : true,
        attributeFilter : [HIGHLIGHT_COLORS_ATTR],
    });

    const initial = readHighlightColorsAttr();

    if (initial)
    {
        setHighlightColors(initial);
        listener(initial);
    }

    return () =>
    {
        window.removeEventListener(HIGHLIGHT_COLORS_EVENT, onEvent);
        observer.disconnect();
    };
}
