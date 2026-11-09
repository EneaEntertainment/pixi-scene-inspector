import { attachPointerDrag } from './pointer-drag';

import type { FloatRect } from './float-rect';

type FloatRectDragOptions = {
    getRect: () => FloatRect;
    setRect: (rect: FloatRect) => void;
    clamp: (rect: FloatRect) => FloatRect;
    onPersist?: () => void;
    shouldStart?: (event: PointerEvent) => boolean;
};

export function attachFloatRectMove(handle: HTMLElement, options: FloatRectDragOptions): () => void
{
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    return attachPointerDrag(handle, {
        shouldStart: options.shouldStart,

        onStart: (event) =>
        {
            const rect = options.getRect();

            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;
        },

        onMove: (event) =>
        {
            const rect = options.getRect();

            options.setRect(options.clamp({
                left   : startLeft + (event.clientX - startX),
                top    : startTop + (event.clientY - startY),
                width  : rect.width,
                height : rect.height,
            }));
        },

        onEnd: () =>
        {
            options.onPersist?.();
        },
    });
}

export function attachFloatRectResize(corner: HTMLElement, options: FloatRectDragOptions): () => void
{
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    return attachPointerDrag(corner, {
        stopPropagation: true,

        shouldStart: options.shouldStart,

        onStart: (event) =>
        {
            const rect = options.getRect();

            startX = event.clientX;
            startY = event.clientY;
            startW = rect.width;
            startH = rect.height;
        },

        onMove: (event) =>
        {
            const rect = options.getRect();

            options.setRect(options.clamp({
                left   : rect.left,
                top    : rect.top,
                width  : startW + (event.clientX - startX),
                height : startH + (event.clientY - startY),
            }));
        },

        onEnd: () =>
        {
            options.onPersist?.();
        },
    });
}
