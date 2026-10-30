import {
    highlightFill,
    highlightStroke,
    MARK_FILL,
} from '../../highlight-colors';
import { ANCHOR_SIZE, HANDLE_SIZE, OVERLAY_ID, ROTATE_STALK } from './constants';
import { localToRoot, normalize2 } from './math';

import type { BoxPaint, OverlayRoot } from './types';

function placeAtRoot(el: HTMLElement, x: number, y: number, half = HANDLE_SIZE / 2)
{
    el.style.left = `${x - half}px`;
    el.style.top = `${y - half}px`;
}

function styleHandle(el: HTMLDivElement, cursor: string)
{
    Object.assign(el.style, {
        position      : 'absolute',
        width         : `${HANDLE_SIZE}px`,
        height        : `${HANDLE_SIZE}px`,
        boxSizing     : 'border-box',
        background    : MARK_FILL,
        border        : `1px solid ${highlightStroke()}`,
        pointerEvents : 'auto',
        cursor,
        zIndex        : '2',
        touchAction   : 'none',
    });
}

export function applyHighlightPaint(overlay: OverlayRoot)
{
    const fill = highlightFill();
    const stroke = highlightStroke();

    overlay.box.style.background = fill;
    overlay.outline.setAttribute('stroke', stroke);
    overlay.rotateStalk.style.background = stroke;

    const border = `1px solid ${stroke}`;

    overlay.rotateHandle.style.border = border;
    overlay.scaleXHandle.style.border = border;
    overlay.scaleYHandle.style.border = border;
    overlay.uniformHandle.style.border = border;
    overlay.anchorMark.style.border = border;
}

export function createOverlayRoot(): OverlayRoot
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
        overflow      : 'visible',
        pointerEvents : 'none',
        zIndex        : '2147483640',
        display       : 'none',
    });

    const box = document.createElement('div');

    Object.assign(box.style, {
        position        : 'absolute',
        left            : '0',
        top             : '0',
        transformOrigin : '0 0',
        background      : highlightFill(),
        willChange      : 'transform',
        pointerEvents   : 'auto',
        cursor          : 'move',
        touchAction     : 'none',
    });

    const outlineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    Object.assign(outlineSvg.style, {
        position      : 'absolute',
        left          : '0',
        top           : '0',
        width         : '1px',
        height        : '1px',
        overflow      : 'visible',
        pointerEvents : 'none',
    });

    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', highlightStroke());
    outline.setAttribute('stroke-width', '1');
    outline.setAttribute('vector-effect', 'non-scaling-stroke');
    outlineSvg.appendChild(outline);

    const rotateStalk = document.createElement('div');

    Object.assign(rotateStalk.style, {
        position        : 'absolute',
        left            : '0',
        top             : '0',
        width           : `${ROTATE_STALK}px`,
        height          : '1px',
        background      : highlightStroke(),
        pointerEvents   : 'none',
        transformOrigin : '0 50%',
        zIndex          : '1',
        display         : 'none',
    });

    const rotateHandle = document.createElement('div');

    styleHandle(rotateHandle, 'pointer');
    rotateHandle.style.display = 'none';

    const scaleXHandle = document.createElement('div');

    styleHandle(scaleXHandle, 'pointer');
    scaleXHandle.style.display = 'none';

    const scaleYHandle = document.createElement('div');

    styleHandle(scaleYHandle, 'pointer');
    scaleYHandle.style.display = 'none';

    const uniformHandle = document.createElement('div');

    styleHandle(uniformHandle, 'pointer');
    uniformHandle.style.display = 'none';

    const anchorMark = document.createElement('div');

    Object.assign(anchorMark.style, {
        position      : 'absolute',
        left          : '0',
        top           : '0',
        width         : `${ANCHOR_SIZE}px`,
        height        : `${ANCHOR_SIZE}px`,
        boxSizing     : 'border-box',
        borderRadius  : '50%',
        background    : MARK_FILL,
        border        : `1px solid ${highlightStroke()}`,
        display       : 'none',
        willChange    : 'transform',
        pointerEvents : 'none',
    });

    root.appendChild(box);
    root.appendChild(outlineSvg);
    root.appendChild(rotateStalk);
    root.appendChild(rotateHandle);
    root.appendChild(scaleXHandle);
    root.appendChild(scaleYHandle);
    root.appendChild(uniformHandle);
    root.appendChild(anchorMark);
    document.body.appendChild(root);

    return {
        root,
        box,
        outline,
        anchorMark,
        rotateStalk,
        rotateHandle,
        scaleXHandle,
        scaleYHandle,
        uniformHandle,
    };
}

export function setHandlesVisible(overlay: OverlayRoot, visible: boolean)
{
    const display = visible ? 'block' : 'none';

    overlay.rotateStalk.style.display = display;
    overlay.rotateHandle.style.display = display;
    overlay.scaleXHandle.style.display = display;
    overlay.scaleYHandle.style.display = display;
    overlay.uniformHandle.style.display = display;
    overlay.box.style.pointerEvents = visible ? 'auto' : 'none';
}

export function layoutHandles(overlay: OverlayRoot, next: BoxPaint)
{
    const top = localToRoot(next, next.width / 2, 0);
    const right = localToRoot(next, next.width, next.height / 2);
    const bottom = localToRoot(next, next.width / 2, next.height);
    const corner = localToRoot(next, next.width, next.height);
    const outward = normalize2(-next.matrix.c, -next.matrix.d) ?? { x: 0, y: -1 };
    const rotateTip = {
        x : top.x + (outward.x * ROTATE_STALK),
        y : top.y + (outward.y * ROTATE_STALK),
    };

    overlay.rotateStalk.style.left = `${top.x}px`;
    overlay.rotateStalk.style.top = `${top.y}px`;
    overlay.rotateStalk.style.transform = `rotate(${Math.atan2(outward.y, outward.x)}rad)`;

    placeAtRoot(overlay.rotateHandle, rotateTip.x, rotateTip.y);
    placeAtRoot(overlay.scaleXHandle, right.x, right.y);
    placeAtRoot(overlay.scaleYHandle, bottom.x, bottom.y);
    placeAtRoot(overlay.uniformHandle, corner.x, corner.y);
}
