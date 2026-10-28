import { isNodeAlive, type PageGlobals, type PixiNode } from '../page-ops/pixi-node';
import { readHighlightEnabled } from './shell/settings';

const OVERLAY_ID = 'pixi-scene-inspector-selection-highlight';
const FILL = 'rgba(64, 140, 255, 0.35)';
const STROKE = 'rgba(40, 120, 255, 0.95)';
const ANCHOR_FILL = 'rgba(255, 255, 255, 1)';
const EMPTY_SIZE = 4;
const ANCHOR_SIZE = 6;

type MatrixLike = {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
};

type LocalBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

type SelectionHighlight = {
    setEnabled: (enabled: boolean) => void;
    destroy: () => void;
};

function asFiniteNumber(value: unknown): number | null
{
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readLocalBounds(node: PixiNode): LocalBounds | null
{
    if (typeof node.getLocalBounds !== 'function')
    {
        return null;
    }

    try
    {
        const bounds = node.getLocalBounds() as Record<string, unknown> | null | undefined;

        if (!bounds || typeof bounds !== 'object')
        {
            return null;
        }

        const minX = asFiniteNumber(bounds.minX) ?? asFiniteNumber(bounds.x);
        const minY = asFiniteNumber(bounds.minY) ?? asFiniteNumber(bounds.y);

        if (minX === null || minY === null)
        {
            return null;
        }

        const maxX = asFiniteNumber(bounds.maxX);
        const maxY = asFiniteNumber(bounds.maxY);

        if (maxX !== null && maxY !== null)
        {
            return { minX, minY, maxX, maxY };
        }

        const width = asFiniteNumber(bounds.width);
        const height = asFiniteNumber(bounds.height);

        if (width === null || height === null)
        {
            return null;
        }

        return {
            minX,
            minY,
            maxX : minX + width,
            maxY : minY + height,
        };
    }
    catch
    {
        return null;
    }
}

function readWorldTransform(node: PixiNode): MatrixLike | null
{
    const matrix = node.worldTransform;

    if (!matrix)
    {
        return null;
    }

    const a = asFiniteNumber(matrix.a);
    const b = asFiniteNumber(matrix.b);
    const c = asFiniteNumber(matrix.c);
    const d = asFiniteNumber(matrix.d);
    const tx = asFiniteNumber(matrix.tx);
    const ty = asFiniteNumber(matrix.ty);

    if (
        a === null
        || b === null
        || c === null
        || d === null
        || tx === null
        || ty === null
    )
    {
        return null;
    }

    return { a, b, c, d, tx, ty };
}

function findPixiCanvas(win: PageGlobals): HTMLCanvasElement | null
{
    const app = win.__PIXI_APP__;
    const renderer = win.__PIXI_RENDERER__ || app?.renderer;

    const candidates = [
        app?.canvas,
        app?.view,
        renderer?.canvas,
        renderer?.view,
    ];

    for (const candidate of candidates)
    {
        if (candidate instanceof HTMLCanvasElement)
        {
            return candidate;
        }
    }

    return null;
}

function readScreenSize(win: PageGlobals, canvas: HTMLCanvasElement): { width: number; height: number }
{
    const app = win.__PIXI_APP__;
    const screenW = asFiniteNumber(app?.screen?.width);
    const screenH = asFiniteNumber(app?.screen?.height);

    if (screenW !== null && screenH !== null && screenW > 0 && screenH > 0)
    {
        return { width: screenW, height: screenH };
    }

    const renderer = win.__PIXI_RENDERER__ || app?.renderer;
    const resolution = asFiniteNumber(renderer?.resolution) ?? 1;
    const rendererW = asFiniteNumber(renderer?.width);
    const rendererH = asFiniteNumber(renderer?.height);

    if (
        rendererW !== null
        && rendererH !== null
        && resolution > 0
        && rendererW > 0
        && rendererH > 0
    )
    {
        return {
            width  : rendererW / resolution,
            height : rendererH / resolution,
        };
    }

    const cssW = canvas.clientWidth || canvas.getBoundingClientRect().width;
    const cssH = canvas.clientHeight || canvas.getBoundingClientRect().height;

    return {
        width  : cssW > 0 ? cssW : 1,
        height : cssH > 0 ? cssH : 1,
    };
}

function hasAnchor(node: PixiNode): boolean
{
    const anchor = node.anchor;

    if (!anchor)
    {
        return false;
    }

    return asFiniteNumber(anchor.x) !== null && asFiniteNumber(anchor.y) !== null;
}

function createOverlayRoot(): {
    root: HTMLDivElement;
    box: HTMLDivElement;
    anchorMark: HTMLDivElement;
}
{
    document.getElementById(OVERLAY_ID)?.remove();

    const root = document.createElement('div');

    root.id = OVERLAY_ID;

    Object.assign(root.style, {
        position      : 'fixed',
        left          : '0',
        top           : '0',
        width         : '0',
        height        : '0',
        overflow      : 'hidden',
        pointerEvents : 'none',
        zIndex        : '2147483640',
        display       : 'none',
    });

    const box = document.createElement('div');

    Object.assign(box.style, {
        position        : 'absolute',
        left            : '0',
        top             : '0',
        boxSizing       : 'border-box',
        transformOrigin : '0 0',
        background      : FILL,
        border          : `1px solid ${STROKE}`,
        willChange      : 'transform',
    });

    const anchorMark = document.createElement('div');

    Object.assign(anchorMark.style, {
        position     : 'absolute',
        left         : '0',
        top          : '0',
        width        : `${ANCHOR_SIZE}px`,
        height       : `${ANCHOR_SIZE}px`,
        boxSizing    : 'border-box',
        borderRadius : '50%',
        background   : ANCHOR_FILL,
        border       : `1px solid ${STROKE}`,
        display      : 'none',
        willChange   : 'transform',
    });

    root.appendChild(box);
    root.appendChild(anchorMark);
    document.body.appendChild(root);

    return { root, box, anchorMark };
}

export function installSelectionHighlight(win: PageGlobals = globalThis as PageGlobals): SelectionHighlight
{
    const { root, box, anchorMark } = createOverlayRoot();
    let frame = 0;
    let running = false;
    let destroyed = false;
    let enabled = readHighlightEnabled();

    function hide()
    {
        root.style.display = 'none';
        anchorMark.style.display = 'none';
    }

    function stop()
    {
        if (!running)
        {
            return;
        }

        running = false;
        cancelAnimationFrame(frame);
        frame = 0;
        hide();
    }

    function tick()
    {
        if (destroyed || !enabled)
        {
            running = false;
            frame = 0;

            hide();

            return;
        }

        frame = requestAnimationFrame(tick);

        const node = win.$pixi;

        if (!isNodeAlive(node))
        {
            hide();

            return;
        }

        const canvas = findPixiCanvas(win);
        const matrix = readWorldTransform(node);
        const bounds = readLocalBounds(node);

        if (!canvas || !matrix || !bounds)
        {
            hide();

            return;
        }

        const rect = canvas.getBoundingClientRect();

        if (!(rect.width > 0) || !(rect.height > 0))
        {
            hide();

            return;
        }

        let minX = bounds.minX;
        let minY = bounds.minY;
        let width = bounds.maxX - bounds.minX;
        let height = bounds.maxY - bounds.minY;

        if (!(width > 0) || !(height > 0))
        {
            const cx = (bounds.minX + bounds.maxX) / 2;
            const cy = (bounds.minY + bounds.maxY) / 2;

            minX = cx - (EMPTY_SIZE / 2);
            minY = cy - (EMPTY_SIZE / 2);
            width = EMPTY_SIZE;
            height = EMPTY_SIZE;
        }

        const screen = readScreenSize(win, canvas);
        const scaleX = rect.width / screen.width;
        const scaleY = rect.height / screen.height;
        const a = matrix.a * scaleX;
        const b = matrix.b * scaleY;
        const c = matrix.c * scaleX;
        const d = matrix.d * scaleY;
        const tx = ((matrix.a * minX) + (matrix.c * minY) + matrix.tx) * scaleX;
        const ty = ((matrix.b * minX) + (matrix.d * minY) + matrix.ty) * scaleY;

        root.style.display = 'block';
        root.style.left = `${rect.left}px`;
        root.style.top = `${rect.top}px`;
        root.style.width = `${rect.width}px`;
        root.style.height = `${rect.height}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        box.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`;

        if (hasAnchor(node))
        {
            const half = ANCHOR_SIZE / 2;
            const originX = (matrix.tx * scaleX) - half;
            const originY = (matrix.ty * scaleY) - half;

            anchorMark.style.display = 'block';
            anchorMark.style.transform = `translate(${originX}px, ${originY}px)`;
        }
        else
        {
            anchorMark.style.display = 'none';
        }
    }

    function start()
    {
        if (destroyed || !enabled || running)
        {
            return;
        }

        running = true;
        frame = requestAnimationFrame(tick);
    }

    start();

    return {
        setEnabled: (next) =>
        {
            enabled = next;

            if (next)
            {
                start();
            }
            else
            {
                stop();
            }
        },

        destroy: () =>
        {
            destroyed = true;

            stop();
            root.remove();
        },
    };
}
