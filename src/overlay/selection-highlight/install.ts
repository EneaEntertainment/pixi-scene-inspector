import { subscribeHighlightColors } from '../../highlight-colors';
import {
    DEFAULT_HIGHLIGHT_GUIDES,
    type HighlightGuidesSettings,
    readHighlightGuidesAttr,
    subscribeHighlightGuides,
} from '../../highlight-guides';
import { isNode3D } from '../../page-ops/node-3d';
import { resolveLiveSelectionNodes } from '../../page-ops/resolve-selection';
import { readHighlightEnabled } from '../shell/settings';
import { ANCHOR_SIZE, EMPTY_SIZE } from './constants';
import { attachHighlightTransformDrag } from './drag';
import {
    findPixiCanvas,
    hasAnchor,
    readLocalBounds,
    readPivot,
    readScreenSize,
    readWorldTransform,
    worldCorners,
} from './geometry';
import { installGizmo3D } from './gizmo-3d';
import {
    applyHighlightPaint,
    createOverlayRoot,
    layoutGuides,
    layoutHandles,
    setGuidesVisible,
    setHandlesVisible,
} from './overlay-dom';

import type { PageGlobals, PixiNode } from '../../page-ops/pixi-node';
import type { BoxPaint, LocalBounds, MatrixLike, SelectionHighlight } from './types';

export function installSelectionHighlight(win: PageGlobals = globalThis as PageGlobals): SelectionHighlight
{
    const overlay = createOverlayRoot();
    const { root, box, outline, pivotMark, anchorMark } = overlay;

    let frame = 0;
    let running = false;
    let destroyed = false;
    let enabled = readHighlightEnabled();
    let guidesSettings: HighlightGuidesSettings = readHighlightGuidesAttr() ?? { ...DEFAULT_HIGHLIGHT_GUIDES };
    let guidesDragging = false;
    let paint: BoxPaint | null = null;

    const unsubscribeColors = subscribeHighlightColors(() =>
    {
        applyHighlightPaint(overlay);
    });

    function guidesWanted(): boolean
    {
        return guidesDragging ? guidesSettings.drag : guidesSettings.idle;
    }

    function syncGuidesVisibility()
    {
        const visible = paint !== null && guidesWanted();

        setGuidesVisible(overlay, visible);

        if (visible && paint)
        {
            layoutGuides(overlay, paint);
        }
    }

    const unsubscribeGuides = subscribeHighlightGuides((next) =>
    {
        guidesSettings = next;
        syncGuidesVisibility();
    });

    const drag = attachHighlightTransformDrag({
        overlay,
        getPaint          : () => paint,
        resolveNodes      : () => resolveLiveSelectionNodes(win),
        setGuidesDragging : (dragging) =>
        {
            guidesDragging = dragging;
            syncGuidesVisibility();
        },
    });

    const gizmo = installGizmo3D(() =>
    {
        if (!enabled)
        {
            return null;
        }

        const nodes = resolveLiveSelectionNodes(win);

        if (nodes.length !== 1)
        {
            return null;
        }

        const node = nodes[0];

        if (!node || !isNode3D(node))
        {
            return null;
        }

        return node;
    });

    function hide()
    {
        root.style.display = 'none';
        pivotMark.style.display = 'none';
        anchorMark.style.display = 'none';
        paint = null;
        guidesDragging = false;

        setHandlesVisible(overlay, false);
        setGuidesVisible(overlay, false);
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
        gizmo.sync(null);
    }

    function publishPaint(
        width: number,
        height: number,
        matrix: MatrixLike,
        rect: DOMRect,
        scaleX: number,
        scaleY: number,
        interactive = true,
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

        setHandlesVisible(overlay, interactive);

        paint = {
            width,
            height,
            matrix,
            rootLeft     : rect.left,
            rootTop      : rect.top,
            viewRight    : rect.right,
            viewBottom   : rect.bottom,
            canvasScaleX : scaleX,
            canvasScaleY : scaleY,
        };

        if (interactive)
        {
            layoutHandles(overlay, paint);
        }

        syncGuidesVisibility();
    }

    function paintAxisAlignedGlobal(bounds: LocalBounds, scaleX: number, scaleY: number, rect: DOMRect, interactive: boolean)
    {
        const left = bounds.minX * scaleX;
        const top = bounds.minY * scaleY;
        const width = Math.max(EMPTY_SIZE, (bounds.maxX - bounds.minX) * scaleX);
        const height = Math.max(EMPTY_SIZE, (bounds.maxY - bounds.minY) * scaleY);

        publishPaint(
            width,
            height,
            { a: 1, b: 0, c: 0, d: 1, tx: left, ty: top },
            rect,
            scaleX,
            scaleY,
            interactive,
        );
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

        const half = ANCHOR_SIZE / 2;
        const pivot = readPivot(node);

        if (pivot)
        {
            const pivotX = (((matrix.a * pivot.x) + (matrix.c * pivot.y) + matrix.tx) * scaleX) - half;
            const pivotY = (((matrix.b * pivot.x) + (matrix.d * pivot.y) + matrix.ty) * scaleY) - half;

            pivotMark.style.display = 'block';
            pivotMark.style.transform = `translate(${pivotX}px, ${pivotY}px)`;
        }
        else
        {
            pivotMark.style.display = 'none';
        }

        if (hasAnchor(node))
        {
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

    function appendNodeGlobalCorners(
        node: PixiNode,
        into: { minX: number; minY: number; maxX: number; maxY: number; any: boolean },
    )
    {
        const matrix = readWorldTransform(node);
        const bounds = readLocalBounds(node);

        if (!matrix || !bounds)
        {
            return;
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
            into.any = true;
            into.minX = Math.min(into.minX, corner.x);
            into.minY = Math.min(into.minY, corner.y);
            into.maxX = Math.max(into.maxX, corner.x);
            into.maxY = Math.max(into.maxY, corner.y);
        }
    }

    function paintUnion(nodes: Array<PixiNode>, scaleX: number, scaleY: number, rect: DOMRect)
    {
        const into = {
            minX : Number.POSITIVE_INFINITY,
            minY : Number.POSITIVE_INFINITY,
            maxX : Number.NEGATIVE_INFINITY,
            maxY : Number.NEGATIVE_INFINITY,
            any  : false,
        };

        for (const node of nodes)
        {
            appendNodeGlobalCorners(node, into);
        }

        if (!into.any)
        {
            hide();

            return;
        }

        paintAxisAlignedGlobal(
            {
                minX : into.minX,
                minY : into.minY,
                maxX : into.maxX,
                maxY : into.maxY,
            },
            scaleX,
            scaleY,
            rect,
            true,
        );

        pivotMark.style.display = 'none';
        anchorMark.style.display = 'none';
    }

    function tick()
    {
        if (destroyed || !enabled)
        {
            running = false;
            frame = 0;

            hide();
            gizmo.sync(null);

            return;
        }

        frame = requestAnimationFrame(tick);

        const canvas = findPixiCanvas(win);

        if (!canvas)
        {
            hide();
            gizmo.sync(null);

            return;
        }

        const rect = canvas.getBoundingClientRect();

        if (!(rect.width > 0) || !(rect.height > 0))
        {
            hide();
            gizmo.sync(null);

            return;
        }

        const screen = readScreenSize(win, canvas);
        const scaleX = rect.width / screen.width;
        const scaleY = rect.height / screen.height;
        const metrics = { rect, scaleX, scaleY };
        const nodes = resolveLiveSelectionNodes(win);

        gizmo.sync(metrics);

        const highlightNodes = nodes.filter((node) => !isNode3D(node));

        if (highlightNodes.length > 1)
        {
            paintUnion(highlightNodes, scaleX, scaleY, rect);

            return;
        }

        if (highlightNodes.length === 1 && highlightNodes[0])
        {
            paintSingle(highlightNodes[0], scaleX, scaleY, rect);

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
                gizmo.cancel();
                stop();
            }
        },

        destroy: () =>
        {
            destroyed = true;

            unsubscribeColors();
            unsubscribeGuides();
            drag.cancel();
            gizmo.cancel();
            gizmo.destroy();
            stop();
            root.remove();
        },
    };
}
