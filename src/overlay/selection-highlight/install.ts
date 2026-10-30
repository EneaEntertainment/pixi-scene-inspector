import { subscribeHighlightColors } from '../../highlight-colors';
import { resolveLiveSelectionNodes } from '../../page-ops/resolve-selection';
import { readHighlightEnabled } from '../shell/settings';
import { ANCHOR_SIZE, EMPTY_SIZE } from './constants';
import { attachHighlightTransformDrag } from './drag';
import { findPixiCanvas, hasAnchor, readLocalBounds, readScreenSize, readWorldTransform, worldCorners } from './geometry';
import { applyHighlightPaint, createOverlayRoot, layoutHandles, setHandlesVisible } from './overlay-dom';

import type { PageGlobals, PixiNode } from '../../page-ops/pixi-node';
import type { BoxPaint, MatrixLike, SelectionHighlight } from './types';

export function installSelectionHighlight(
    win: PageGlobals = globalThis as PageGlobals,
): SelectionHighlight
{
    const overlay = createOverlayRoot();
    const { root, box, outline, anchorMark } = overlay;

    let frame = 0;
    let running = false;
    let destroyed = false;
    let enabled = readHighlightEnabled();
    let paint: BoxPaint | null = null;

    const unsubscribeColors = subscribeHighlightColors(() =>
    {
        applyHighlightPaint(overlay);
    });

    const drag = attachHighlightTransformDrag({
        overlay,
        getPaint     : () => paint,
        resolveNodes : () => resolveLiveSelectionNodes(win),
    });

    function hide()
    {
        root.style.display = 'none';
        anchorMark.style.display = 'none';
        paint = null;

        setHandlesVisible(overlay, false);
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

    function publishPaint(
        width: number,
        height: number,
        matrix: MatrixLike,
        rect: DOMRect,
        scaleX: number,
        scaleY: number,
    )
    {
        const transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.tx}, ${matrix.ty})`;

        root.style.display = 'block';
        root.style.left = `${rect.left}px`;
        root.style.top = `${rect.top}px`;
        root.style.width = `${rect.width}px`;
        root.style.height = `${rect.height}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        box.style.transform = transform;

        outline.setAttribute('width', String(width));
        outline.setAttribute('height', String(height));
        outline.setAttribute('transform', transform);

        setHandlesVisible(overlay, true);

        paint = {
            width,
            height,
            matrix,
            rootLeft     : rect.left,
            rootTop      : rect.top,
            canvasScaleX : scaleX,
            canvasScaleY : scaleY,
        };

        layoutHandles(overlay, paint);
    }

    function paintSingle(node: PixiNode, scaleX: number, scaleY: number, rect: DOMRect)
    {
        const matrix = readWorldTransform(node);
        const bounds = readLocalBounds(node);

        if (!matrix || !bounds)
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

        const a = matrix.a * scaleX;
        const b = matrix.b * scaleY;
        const c = matrix.c * scaleX;
        const d = matrix.d * scaleY;
        const tx = ((matrix.a * minX) + (matrix.c * minY) + matrix.tx) * scaleX;
        const ty = ((matrix.b * minX) + (matrix.d * minY) + matrix.ty) * scaleY;

        publishPaint(width, height, { a, b, c, d, tx, ty }, rect, scaleX, scaleY);

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

    function paintUnion(nodes: Array<PixiNode>, scaleX: number, scaleY: number, rect: DOMRect)
    {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let any = false;

        for (const node of nodes)
        {
            const matrix = readWorldTransform(node);
            const bounds = readLocalBounds(node);

            if (!matrix || !bounds)
            {
                continue;
            }

            let local = bounds;
            const localWidth = bounds.maxX - bounds.minX;
            const localHeight = bounds.maxY - bounds.minY;

            if (!(localWidth > 0) || !(localHeight > 0))
            {
                const cx = (bounds.minX + bounds.maxX) / 2;
                const cy = (bounds.minY + bounds.maxY) / 2;

                local = {
                    minX : cx - (EMPTY_SIZE / 2),
                    minY : cy - (EMPTY_SIZE / 2),
                    maxX : cx + (EMPTY_SIZE / 2),
                    maxY : cy + (EMPTY_SIZE / 2),
                };
            }

            for (const corner of worldCorners(local, matrix))
            {
                any = true;
                minX = Math.min(minX, corner.x);
                minY = Math.min(minY, corner.y);
                maxX = Math.max(maxX, corner.x);
                maxY = Math.max(maxY, corner.y);
            }
        }

        if (!any)
        {
            hide();

            return;
        }

        const left = minX * scaleX;
        const top = minY * scaleY;
        const width = Math.max(EMPTY_SIZE, (maxX - minX) * scaleX);
        const height = Math.max(EMPTY_SIZE, (maxY - minY) * scaleY);

        publishPaint(
            width,
            height,
            { a: 1, b: 0, c: 0, d: 1, tx: left, ty: top },
            rect,
            scaleX,
            scaleY,
        );

        anchorMark.style.display = 'none';
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

        const canvas = findPixiCanvas(win);

        if (!canvas)
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

        const screen = readScreenSize(win, canvas);
        const scaleX = rect.width / screen.width;
        const scaleY = rect.height / screen.height;
        const nodes = resolveLiveSelectionNodes(win);

        if (nodes.length > 1)
        {
            paintUnion(nodes, scaleX, scaleY, rect);

            return;
        }

        if (nodes.length === 1 && nodes[0])
        {
            paintSingle(nodes[0], scaleX, scaleY, rect);

            return;
        }

        hide();
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
                drag.cancel();
                stop();
            }
        },

        destroy: () =>
        {
            destroyed = true;

            unsubscribeColors();
            drag.cancel();
            stop();
            root.remove();
        },
    };
}
