import { highlightTransformGesture } from '../../gesture-active';
import { highlightFill, highlightFillDrag, highlightStroke, highlightStrokeDrag } from '../../highlight-colors';
import { snapToStep } from '../fields/number-drag';
import { readTransformNumber, writeTransformNumber } from '../properties/transform-apply';
import { POSITION_STEP, ROTATION_STEP, SCALE_STEP } from './constants';
import { readWorldTransform } from './geometry';
import { localToScreen, normalize2, project, worldDeltaToParentLocal } from './math';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { NumberPropertyKey } from '../properties/node';
import type { BoxPaint, DragMode, NodeSnapshot, OverlayRoot } from './types';

export type HighlightDragHost = {
    overlay: OverlayRoot;
    getPaint: () => BoxPaint | null;
    resolveNodes: () => Array<PixiNode>;
};

export type HighlightDragController = {
    cancel: () => void;
};

function keysForDragMode(mode: DragMode): Array<NumberPropertyKey>
{
    if (mode === 'move')
    {
        return ['position.x', 'position.y'];
    }

    if (mode === 'rotate')
    {
        return ['rotation'];
    }

    if (mode === 'scaleX')
    {
        return ['scale.x'];
    }

    if (mode === 'scaleY')
    {
        return ['scale.y'];
    }

    return ['scale.x', 'scale.y'];
}

function scaleTipLocal(mode: 'scaleX' | 'scaleY' | 'scaleUniform', width: number, height: number): { x: number; y: number }
{
    if (mode === 'scaleX')
    {
        return { x: width, y: height / 2 };
    }

    if (mode === 'scaleY')
    {
        return { x: width / 2, y: height };
    }

    return { x: width, y: height };
}

function snapshotKeys(nodes: Array<PixiNode>, keys: Array<NumberPropertyKey>): Array<NodeSnapshot>
{
    const out: Array<NodeSnapshot> = [];

    for (const node of nodes)
    {
        const values = new Map<NumberPropertyKey, number>();

        for (const key of keys)
        {
            const value = readTransformNumber(node, key);

            if (typeof value === 'number')
            {
                values.set(key, value);
            }
        }

        if (values.size > 0)
        {
            out.push({ node, values });
        }
    }

    return out;
}

function restoreSnapshots(snapshots: Array<NodeSnapshot>)
{
    for (const entry of snapshots)
    {
        for (const [key, value] of entry.values)
        {
            writeTransformNumber(entry.node, key, value);
        }
    }
}

export function attachHighlightTransformDrag(host: HighlightDragHost): HighlightDragController
{
    const { overlay, getPaint, resolveNodes } = host;
    const {
        root,
        box,
        outline,
        rotateHandle,
        scaleXHandle,
        scaleYHandle,
        uniformHandle,
    } = overlay;

    let dragMode: DragMode | null = null;
    let dragPointerId = -1;
    let dragStartClientX = 0;
    let dragStartClientY = 0;
    let dragLastClientX = 0;
    let dragLastClientY = 0;
    let dragStartAngle = 0;
    let dragStartDist = 0;
    let dragSnapshots: Array<NodeSnapshot> = [];
    let dragPaint: BoxPaint | null = null;
    let dragScaleGuide: {
        origin: { x: number; y: number };
        axis: { x: number; y: number };
    } | null = null;
    let dragShift = false;
    let dragAlt = false;

    function endDrag()
    {
        if (dragPointerId < 0 && !dragMode)
        {
            return;
        }

        const wasActive = dragMode !== null || dragPointerId >= 0;

        dragMode = null;
        dragPointerId = -1;
        dragSnapshots = [];
        dragPaint = null;
        dragScaleGuide = null;
        dragShift = false;
        dragAlt = false;

        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
        window.removeEventListener('keydown', onWindowKeyDown, true);
        window.removeEventListener('keyup', onWindowKeyUp, true);

        if (wasActive)
        {
            box.style.background = highlightFill();

            outline.setAttribute('stroke', highlightStroke());

            highlightTransformGesture.end();
        }
    }

    function cancelDrag()
    {
        if (!dragMode)
        {
            return;
        }

        restoreSnapshots(dragSnapshots);
        endDrag();
    }

    function applyMove(clientX: number, clientY: number, snap: boolean, lockAxis: boolean)
    {
        const base = dragPaint;

        if (!base)
        {
            return;
        }

        let dx = (clientX - dragStartClientX) / base.canvasScaleX;
        let dy = (clientY - dragStartClientY) / base.canvasScaleY;

        if (lockAxis)
        {
            if (Math.abs(dx) >= Math.abs(dy))
            {
                dy = 0;
            }
            else
            {
                dx = 0;
            }
        }

        for (const entry of dragSnapshots)
        {
            const local = worldDeltaToParentLocal(entry.node, dx, dy);
            const sx = entry.values.get('position.x');
            const sy = entry.values.get('position.y');

            if (typeof sx === 'number')
            {
                const next = sx + local.x;

                writeTransformNumber(
                    entry.node,
                    'position.x',
                    snap ? snapToStep(next, POSITION_STEP) : next,
                );
            }

            if (typeof sy === 'number')
            {
                const next = sy + local.y;

                writeTransformNumber(
                    entry.node,
                    'position.y',
                    snap ? snapToStep(next, POSITION_STEP) : next,
                );
            }
        }
    }

    function applyRotate(clientX: number, clientY: number, snap: boolean)
    {
        const base = dragPaint;

        if (!base)
        {
            return;
        }

        const center = localToScreen(base, base.width / 2, base.height / 2);
        const angle = Math.atan2(clientY - center.y, clientX - center.x);
        const delta = angle - dragStartAngle;

        for (const entry of dragSnapshots)
        {
            const start = entry.values.get('rotation');

            if (typeof start === 'number')
            {
                const next = start + delta;

                writeTransformNumber(
                    entry.node,
                    'rotation',
                    snap ? snapToStep(next, ROTATION_STEP) : next,
                );
            }
        }
    }

    function pivotScreenCentroid(nodes: Array<PixiNode>, paint: BoxPaint): { x: number; y: number } | null
    {
        let sumX = 0;
        let sumY = 0;
        let count = 0;

        for (const node of nodes)
        {
            const world = readWorldTransform(node);

            if (!world)
            {
                continue;
            }

            sumX += paint.rootLeft + (world.tx * paint.canvasScaleX);
            sumY += paint.rootTop + (world.ty * paint.canvasScaleY);
            count += 1;
        }

        if (count === 0)
        {
            return null;
        }

        return {
            x : sumX / count,
            y : sumY / count,
        };
    }

    function scaleAxisUnit(
        base: BoxPaint,
        mode: 'scaleX' | 'scaleY' | 'scaleUniform',
        nodes: Array<PixiNode>,
    ): {
        origin: { x: number; y: number };
        axis: { x: number; y: number };
    } | null
    {
        const origin = pivotScreenCentroid(nodes, base)
            ?? localToScreen(base, base.width / 2, base.height / 2);
        const local = scaleTipLocal(mode, base.width, base.height);
        const tip = localToScreen(base, local.x, local.y);
        const axis = normalize2(tip.x - origin.x, tip.y - origin.y);

        return axis ? { origin, axis } : null;
    }

    function applyScale(clientX: number, clientY: number, mode: 'scaleX' | 'scaleY' | 'scaleUniform', snap: boolean)
    {
        const base = dragPaint;
        const guide = dragScaleGuide;

        if (!base || !guide || !(Math.abs(dragStartDist) > 1e-6))
        {
            return;
        }

        const dist = project(clientX, clientY, guide.origin.x, guide.origin.y, guide.axis);
        const ratio = dist / dragStartDist;

        if (!Number.isFinite(ratio))
        {
            return;
        }

        for (const entry of dragSnapshots)
        {
            if (mode === 'scaleX' || mode === 'scaleUniform')
            {
                const start = entry.values.get('scale.x');

                if (typeof start === 'number')
                {
                    const next = start * ratio;

                    writeTransformNumber(
                        entry.node,
                        'scale.x',
                        snap ? snapToStep(next, SCALE_STEP) : next,
                    );
                }
            }

            if (mode === 'scaleY' || mode === 'scaleUniform')
            {
                const start = entry.values.get('scale.y');

                if (typeof start === 'number')
                {
                    const next = start * ratio;

                    writeTransformNumber(
                        entry.node,
                        'scale.y',
                        snap ? snapToStep(next, SCALE_STEP) : next,
                    );
                }
            }
        }
    }

    function applyDragAt(clientX: number, clientY: number, snap: boolean, lockAxis: boolean)
    {
        if (!dragMode)
        {
            return;
        }

        dragLastClientX = clientX;
        dragLastClientY = clientY;

        if (dragMode === 'move')
        {
            applyMove(clientX, clientY, snap, lockAxis);
        }
        else if (dragMode === 'rotate')
        {
            applyRotate(clientX, clientY, snap);
        }
        else
        {
            applyScale(clientX, clientY, dragMode, snap);
        }
    }

    function applyDrag(event: PointerEvent)
    {
        dragShift = event.shiftKey;
        dragAlt = event.altKey;

        applyDragAt(event.clientX, event.clientY, dragAlt, dragShift);
    }

    function reapplyDragModifiers()
    {
        if (!dragMode)
        {
            return;
        }

        applyDragAt(dragLastClientX, dragLastClientY, dragAlt, dragShift);
    }

    function onWindowPointerMove(event: PointerEvent)
    {
        if (event.pointerId !== dragPointerId || !dragMode)
        {
            return;
        }

        if ((event.buttons & 1) === 0)
        {
            applyDrag(event);
            endDrag();

            return;
        }

        applyDrag(event);
    }

    function onWindowPointerUp(event: PointerEvent)
    {
        if (event.pointerId !== dragPointerId)
        {
            return;
        }

        applyDrag(event);
        endDrag();
    }

    function onWindowKeyDown(event: KeyboardEvent)
    {
        if (!dragMode)
        {
            return;
        }

        if (event.key === 'Escape')
        {
            event.preventDefault();
            event.stopImmediatePropagation();
            cancelDrag();

            return;
        }

        if (event.key === 'Shift')
        {
            dragShift = true;

            reapplyDragModifiers();
        }
        else if (event.key === 'Alt')
        {
            dragAlt = true;

            reapplyDragModifiers();
        }
    }

    function onWindowKeyUp(event: KeyboardEvent)
    {
        if (!dragMode)
        {
            return;
        }

        if (event.key === 'Shift')
        {
            dragShift = false;

            reapplyDragModifiers();
        }
        else if (event.key === 'Alt')
        {
            dragAlt = false;

            reapplyDragModifiers();
        }
    }

    function beginDrag(mode: DragMode, event: PointerEvent)
    {
        const paint = getPaint();

        if (dragMode || !paint || root.style.display === 'none')
        {
            return;
        }

        const nodes = resolveNodes();

        if (nodes.length === 0)
        {
            return;
        }

        const snapshots = snapshotKeys(nodes, keysForDragMode(mode));

        if (snapshots.length === 0)
        {
            return;
        }

        dragMode = mode;
        dragPointerId = event.pointerId;
        dragStartClientX = event.clientX;
        dragStartClientY = event.clientY;
        dragLastClientX = event.clientX;
        dragLastClientY = event.clientY;
        dragShift = event.shiftKey;
        dragAlt = event.altKey;
        dragSnapshots = snapshots;
        dragPaint = { ...paint, matrix: { ...paint.matrix } };
        box.style.background = highlightFillDrag();

        outline.setAttribute('stroke', highlightStrokeDrag());
        highlightTransformGesture.begin();

        if (mode === 'rotate')
        {
            const center = localToScreen(dragPaint, dragPaint.width / 2, dragPaint.height / 2);

            dragStartAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
        }
        else if (mode === 'scaleX' || mode === 'scaleY' || mode === 'scaleUniform')
        {
            const guide = scaleAxisUnit(dragPaint, mode, nodes);

            dragScaleGuide = guide;
            dragStartDist = guide
                ? project(event.clientX, event.clientY, guide.origin.x, guide.origin.y, guide.axis)
                : 0;

            if (!(Math.abs(dragStartDist) > 1e-6) && guide)
            {
                const local = scaleTipLocal(mode, dragPaint.width, dragPaint.height);
                const tip = localToScreen(dragPaint, local.x, local.y);

                dragStartDist = project(tip.x, tip.y, guide.origin.x, guide.origin.y, guide.axis);
            }
        }

        window.addEventListener('pointermove', onWindowPointerMove);
        window.addEventListener('pointerup', onWindowPointerUp);
        window.addEventListener('pointercancel', onWindowPointerUp);
        window.addEventListener('keydown', onWindowKeyDown, true);
        window.addEventListener('keyup', onWindowKeyUp, true);

        event.preventDefault();
        event.stopPropagation();
    }

    function onBoxPointerDown(event: PointerEvent)
    {
        if (event.button !== 0 || event.target !== box)
        {
            return;
        }

        beginDrag('move', event);
    }

    function bindHandle(handle: HTMLDivElement, mode: DragMode)
    {
        handle.addEventListener('pointerdown', (event) =>
        {
            if (event.button !== 0)
            {
                return;
            }

            beginDrag(mode, event);
        });
    }

    box.addEventListener('pointerdown', onBoxPointerDown);
    bindHandle(rotateHandle, 'rotate');
    bindHandle(scaleXHandle, 'scaleX');
    bindHandle(scaleYHandle, 'scaleY');
    bindHandle(uniformHandle, 'scaleUniform');

    return {
        cancel: cancelDrag,
    };
}
