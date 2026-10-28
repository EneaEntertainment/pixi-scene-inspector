type PointerDragOptions = {
    shouldStart?: (event: PointerEvent) => boolean;
    onStart?: (event: PointerEvent) => void;
    onMove: (event: PointerEvent) => void;
    onEnd?: (event: PointerEvent) => void;
    stopPropagation?: boolean;
};

export function attachPointerDrag(target: HTMLElement, options: PointerDragOptions): () => void
{
    let dragging = false;

    const onPointerDown = (event: PointerEvent) =>
    {
        if (event.button !== 0)
        {
            return;
        }

        if (options.shouldStart && !options.shouldStart(event))
        {
            return;
        }

        dragging = true;

        options.onStart?.(event);
        target.setPointerCapture(event.pointerId);
        event.preventDefault();

        if (options.stopPropagation)
        {
            event.stopPropagation();
        }
    };

    const onPointerMove = (event: PointerEvent) =>
    {
        if (!dragging)
        {
            return;
        }

        options.onMove(event);
    };

    const onPointerUp = (event: PointerEvent) =>
    {
        if (!dragging)
        {
            return;
        }

        dragging = false;

        try
        {
            target.releasePointerCapture(event.pointerId);
        }
        catch
        {
            void 0;
        }

        options.onEnd?.(event);
    };

    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);

    return () =>
    {
        target.removeEventListener('pointerdown', onPointerDown);
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerUp);
        target.removeEventListener('pointercancel', onPointerUp);
    };
}
