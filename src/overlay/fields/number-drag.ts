import { numberDragGesture } from '../../gesture-active';

const DRAG_PX_PER_STEP = 8;
const DRAG_EDGE_PX = 8;
const DRAG_EDGE_PX_PER_SEC = 480;

export function snapToStep(value: number, step: number): number
{
    if (!Number.isFinite(value) || !Number.isFinite(step) || step === 0)
    {
        return value;
    }

    return Math.round(value / step) * step;
}

export type NumberDragBinding = {
    step: number;
    dragAccel?: number;
    getValue: () => number | undefined;
    commit: (value: number, previous: number) => void;
    allowEmpty?: boolean;
    onSyncChrome: () => void;
    onClickFocus: () => void;
};

export type NumberDragHandle = {
    isDragging: () => boolean;
    destroy: () => void;
};

export function attachNumberDrag(
    dragLayer: HTMLElement,
    binding: NumberDragBinding,
): NumberDragHandle
{
    let startY = 0;
    let startValue = 0;
    let lastCommitted = 0;
    let accumulatedY = 0;
    let moved = false;
    let dragging = false;
    let pointerId = -1;
    let edgeDir = 0;
    let edgeRaf = 0;
    let edgeLastTs = 0;
    let edgeHoldStartTs = 0;

    const applyAccumulated = () =>
    {
        const steps = accumulatedY / DRAG_PX_PER_STEP;
        const next = startValue + (steps * binding.step);
        const previous = lastCommitted;

        lastCommitted = next;

        binding.commit(next, previous);
    };

    const stopEdgeScroll = () =>
    {
        edgeDir = 0;
        edgeLastTs = 0;
        edgeHoldStartTs = 0;

        if (edgeRaf !== 0)
        {
            cancelAnimationFrame(edgeRaf);

            edgeRaf = 0;
        }
    };

    const edgeFrame = (ts: number) =>
    {
        edgeRaf = 0;

        if (pointerId < 0 || !dragging || edgeDir === 0)
        {
            return;
        }

        if (edgeHoldStartTs === 0)
        {
            edgeHoldStartTs = ts;
        }

        if (edgeLastTs !== 0)
        {
            const dt = Math.min(0.05, (ts - edgeLastTs) / 1000);
            const holdSec = (ts - edgeHoldStartTs) / 1000;

            const accel = typeof binding.dragAccel === 'number' && binding.dragAccel > 0
                ? binding.dragAccel
                : 0;

            const pxPerSec = DRAG_EDGE_PX_PER_SEC * (1 + (accel * holdSec));

            accumulatedY += edgeDir * pxPerSec * dt;

            applyAccumulated();
        }

        edgeLastTs = ts;
        edgeRaf = requestAnimationFrame(edgeFrame);
    };

    const updateEdgeScroll = (clientY: number) =>
    {
        let nextDir = 0;

        if (clientY <= DRAG_EDGE_PX)
        {
            nextDir = 1;
        }
        else if (clientY >= window.innerHeight - DRAG_EDGE_PX)
        {
            nextDir = -1;
        }

        if (nextDir === edgeDir)
        {
            return;
        }

        edgeDir = nextDir;
        edgeLastTs = 0;
        edgeHoldStartTs = 0;

        if (edgeDir !== 0 && edgeRaf === 0)
        {
            edgeRaf = requestAnimationFrame(edgeFrame);
        }
        else if (edgeDir === 0 && edgeRaf !== 0)
        {
            cancelAnimationFrame(edgeRaf);

            edgeRaf = 0;
        }
    };

    const endDrag = (focusIfClick: boolean) =>
    {
        if (pointerId < 0 && !dragging)
        {
            return;
        }

        const activePointerId = pointerId;
        const wasDragging = dragging;
        const wasMoved = moved;

        pointerId = -1;
        dragging = false;
        moved = false;
        accumulatedY = 0;

        stopEdgeScroll();
        numberDragGesture.end();

        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
        window.removeEventListener('keydown', onWindowKeyDown, true);

        if (activePointerId >= 0)
        {
            try
            {
                dragLayer.releasePointerCapture(activePointerId);
            }
            catch
            {
                void 0;
            }
        }

        binding.onSyncChrome();

        if (focusIfClick && !wasDragging && !wasMoved)
        {
            binding.onClickFocus();
        }
    };

    const cancelDrag = () =>
    {
        if (pointerId < 0 && !dragging)
        {
            return;
        }

        const previous = lastCommitted;

        lastCommitted = startValue;

        binding.commit(startValue, previous);
        endDrag(false);
    };

    const commitSnappedIfAlt = (event: PointerEvent) =>
    {
        if (!event.altKey || !dragging)
        {
            return;
        }

        const value = binding.getValue();
        const current = typeof value === 'number' ? value : startValue;
        const snapped = snapToStep(current, binding.step);
        const previous = lastCommitted;

        lastCommitted = snapped;

        binding.commit(snapped, previous);
    };

    const onWindowPointerMove = (event: PointerEvent) =>
    {
        if (pointerId !== event.pointerId)
        {
            return;
        }

        if ((event.buttons & 1) === 0)
        {
            commitSnappedIfAlt(event);
            endDrag(false);

            return;
        }

        if (!moved)
        {
            const deltaY = startY - event.clientY;

            if (Math.abs(deltaY) < 2)
            {
                return;
            }

            moved = true;
            dragging = true;
            accumulatedY = deltaY;

            binding.onSyncChrome();
        }
        else
        {
            accumulatedY -= event.movementY;
        }

        applyAccumulated();
        updateEdgeScroll(event.clientY);
    };

    const onWindowPointerUp = (event: PointerEvent) =>
    {
        if (pointerId !== event.pointerId)
        {
            return;
        }

        commitSnappedIfAlt(event);
        endDrag(true);
    };

    const onWindowKeyDown = (event: KeyboardEvent) =>
    {
        if (event.key !== 'Escape')
        {
            return;
        }

        if (pointerId < 0 && !dragging)
        {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        cancelDrag();
    };

    const onPointerDown = (event: PointerEvent) =>
    {
        const value = binding.getValue();
        const hasValue = typeof value === 'number';

        if (event.button !== 0 || (!hasValue && !binding.allowEmpty))
        {
            return;
        }

        endDrag(false);

        dragging = false;
        moved = false;
        accumulatedY = 0;
        edgeDir = 0;
        startY = event.clientY;
        startValue = hasValue ? value : 0;
        lastCommitted = startValue;
        pointerId = event.pointerId;

        numberDragGesture.begin();

        dragLayer.setPointerCapture(event.pointerId);
        window.addEventListener('pointermove', onWindowPointerMove);
        window.addEventListener('pointerup', onWindowPointerUp);
        window.addEventListener('pointercancel', onWindowPointerUp);
        window.addEventListener('keydown', onWindowKeyDown, true);
        event.preventDefault();
        binding.onSyncChrome();
    };

    const onLostPointerCapture = (event: PointerEvent) =>
    {
        if (pointerId !== event.pointerId)
        {
            return;
        }

        if ((event.buttons & 1) !== 0)
        {
            return;
        }

        endDrag(false);
    };

    dragLayer.addEventListener('pointerdown', onPointerDown);
    dragLayer.addEventListener('lostpointercapture', onLostPointerCapture);

    return {
        isDragging: () => dragging,

        destroy: () =>
        {
            endDrag(false);
            dragLayer.removeEventListener('pointerdown', onPointerDown);
            dragLayer.removeEventListener('lostpointercapture', onLostPointerCapture);
        },
    };
}
