import { paintTexturePreview } from '../../../page-ops/texture';

import type { CachedTextureEntry } from '../../../page-ops/texture';

const ROOT_MARGIN = '120px 0px';
const PAINTS_PER_FRAME = 12;

type LazyThumbState = {
    canvas: HTMLCanvasElement;
    entry: CachedTextureEntry;
    size: number;
    visible: boolean;
    painted: boolean;
};

export type TexturePickerLazyThumbs = {
    observe: (
        canvas: HTMLCanvasElement,
        entry: CachedTextureEntry,
        size: number,
    ) => void;
    clear: () => void;
    dispose: () => void;
};

function releaseThumbCanvas(canvas: HTMLCanvasElement)
{
    canvas.width = 0;
    canvas.height = 0;
}

export function createTexturePickerLazyThumbs(root: HTMLElement): TexturePickerLazyThumbs
{
    const states = new Map<HTMLCanvasElement, LazyThumbState>();
    const paintQueue: Array<LazyThumbState> = [];
    const queued = new Set<HTMLCanvasElement>();
    let rafId = 0;
    let disposed = false;

    function cancelPaintLoop()
    {
        if (rafId !== 0)
        {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }

        paintQueue.length = 0;

        queued.clear();
    }

    function paintFrame()
    {
        rafId = 0;

        if (disposed)
        {
            return;
        }

        let painted = 0;

        while (painted < PAINTS_PER_FRAME && paintQueue.length > 0)
        {
            const state = paintQueue.shift();

            if (!state)
            {
                break;
            }

            queued.delete(state.canvas);

            if (!states.has(state.canvas) || !state.visible || state.painted)
            {
                continue;
            }

            paintTexturePreview(state.canvas, state.entry.texture, state.size);

            state.painted = true;
            painted += 1;
        }

        if (paintQueue.length > 0)
        {
            rafId = requestAnimationFrame(paintFrame);
        }
    }

    function schedulePaint(state: LazyThumbState)
    {
        if (!state.visible || state.painted || queued.has(state.canvas))
        {
            return;
        }

        queued.add(state.canvas);
        paintQueue.push(state);

        if (rafId === 0)
        {
            rafId = requestAnimationFrame(paintFrame);
        }
    }

    function releaseState(state: LazyThumbState)
    {
        if (!state.painted)
        {
            return;
        }

        releaseThumbCanvas(state.canvas);

        state.painted = false;
    }

    const observer = new IntersectionObserver((entries) =>
    {
        if (disposed)
        {
            return;
        }

        for (const entry of entries)
        {
            const target = entry.target;

            if (!(target instanceof HTMLCanvasElement))
            {
                continue;
            }

            const state = states.get(target);

            if (!state)
            {
                continue;
            }

            state.visible = entry.isIntersecting;

            if (state.visible)
            {
                schedulePaint(state);
            }
            else
            {
                releaseState(state);
            }
        }
    }, {
        root,
        rootMargin : ROOT_MARGIN,
        threshold  : 0,
    });

    return {
        observe(canvas, entry, size)
        {
            if (disposed)
            {
                return;
            }

            const state: LazyThumbState = {
                canvas,
                entry,
                size,
                visible : false,
                painted : false,
            };

            states.set(canvas, state);
            observer.observe(canvas);
        },

        clear()
        {
            cancelPaintLoop();

            for (const state of states.values())
            {
                observer.unobserve(state.canvas);
                releaseState(state);
            }

            states.clear();
        },

        dispose()
        {
            if (disposed)
            {
                return;
            }

            disposed = true;

            cancelPaintLoop();
            observer.disconnect();

            for (const state of states.values())
            {
                releaseState(state);
            }

            states.clear();
        },
    };
}
