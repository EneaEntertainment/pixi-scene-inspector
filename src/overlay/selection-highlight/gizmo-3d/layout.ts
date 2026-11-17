import {
    cameraDistanceToWorld,
    projectWorldPoint,
    readNodeGlobalPosition3D,
    screenToWorldAtDistance,
} from '../geometry-3d';
import { addScaled, dot3, planeBasis, sub3 } from '../math-3d';
import { setGizmoVisible } from './dom';
import { axisDirOf, GIZMO_PLANE_IDS, GIZMO_PLANES } from './planes';
import {
    hideAllWireframes,
    hideTransformHandles,
    paintNodeWireframe,
} from './wireframe';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { AxesWorld } from '../geometry-3d';
import type { Vec3 } from '../math-3d';
import type { GizmoDom } from './dom';
import type { GizmoAxis, GizmoMode, GizmoPlane } from './types';

export const AXIS_SCREEN_PX = 72;
const ARROW_LENGTH_PX = 10;
const ARROW_HALF_WIDTH_PX = 5;
const RING_SEGMENTS = 48;
const PLANE_OFFSET_FRAC = 0.16;
const PLANE_SIZE_FRAC = 0.22;
const SHELL_ID = 'pixi-scene-inspector-shell';

function mountModeBar(modeBar: HTMLDivElement)
{
    const shell = document.getElementById(SHELL_ID);

    if (shell)
    {
        modeBar.style.position = 'absolute';

        if (modeBar.parentElement !== shell)
        {
            shell.appendChild(modeBar);
        }

        return;
    }

    modeBar.style.position = 'fixed';

    if (modeBar.parentElement !== document.body)
    {
        document.body.appendChild(modeBar);
    }
}

function arrowPolygonPoints(ox: number, oy: number, tx: number, ty: number): { points: string; baseX: number; baseY: number }
{
    const dx = tx - ox;
    const dy = ty - oy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const baseX = tx - (ux * ARROW_LENGTH_PX);
    const baseY = ty - (uy * ARROW_LENGTH_PX);
    const leftX = baseX + (px * ARROW_HALF_WIDTH_PX);
    const leftY = baseY + (py * ARROW_HALF_WIDTH_PX);
    const rightX = baseX - (px * ARROW_HALF_WIDTH_PX);
    const rightY = baseY - (py * ARROW_HALF_WIDTH_PX);

    return {
        points: `${tx},${ty} ${leftX},${leftY} ${rightX},${rightY}`,
        baseX,
        baseY,
    };
}

function ringPoints(
    origin: Vec3,
    axis: Vec3,
    radius: number,
    view: NonNullable<PixiNode['_view3d']>,
    scaleX: number,
    scaleY: number,
): string
{
    const basis = planeBasis(axis);

    if (!basis)
    {
        return '';
    }

    const { u, v } = basis;
    const parts: Array<string> = [];

    for (let i = 0; i <= RING_SEGMENTS; i++)
    {
        const t = (i / RING_SEGMENTS) * Math.PI * 2;
        const world = addScaled(
            addScaled(origin, u, Math.cos(t) * radius),
            v,
            Math.sin(t) * radius,
        );
        const screen = projectWorldPoint(view, world);

        if (!screen)
        {
            continue;
        }

        parts.push(`${screen.x * scaleX},${screen.y * scaleY}`);
    }

    return parts.join(' ');
}

function cameraAxisSigns(axes: AxesWorld, cameraPos: Vec3): Record<GizmoAxis, number>
{
    const toCam = sub3(cameraPos, axes.origin);

    return {
        x : Math.sign(dot3(toCam, axes.x)) || 1,
        y : Math.sign(dot3(toCam, axes.y)) || 1,
        z : Math.sign(dot3(toCam, axes.z)) || 1,
    };
}

function planeScreenPoints(
    view: NonNullable<PixiNode['_view3d']>,
    axes: AxesWorld,
    plane: GizmoPlane,
    signs: Record<GizmoAxis, number>,
    worldLen: number,
    scaleX: number,
    scaleY: number,
): string | null
{
    const { u, v } = GIZMO_PLANES[plane];
    const offset = worldLen * PLANE_OFFSET_FRAC;
    const size = worldLen * PLANE_SIZE_FRAC;
    const su = signs[u];
    const sv = signs[v];
    const uDir = axisDirOf(axes, u);
    const vDir = axisDirOf(axes, v);
    const parts: Array<string> = [];

    const corners = [
        addScaled(addScaled(axes.origin, uDir, su * offset), vDir, sv * offset),
        addScaled(addScaled(axes.origin, uDir, su * (offset + size)), vDir, sv * offset),
        addScaled(addScaled(axes.origin, uDir, su * (offset + size)), vDir, sv * (offset + size)),
        addScaled(addScaled(axes.origin, uDir, su * offset), vDir, sv * (offset + size)),
    ];

    for (const corner of corners)
    {
        const screen = projectWorldPoint(view, corner);

        if (!screen)
        {
            return null;
        }

        parts.push(`${screen.x * scaleX},${screen.y * scaleY}`);
    }

    return parts.join(' ');
}

function projectedUnitPixels(
    view: NonNullable<PixiNode['_view3d']>,
    origin: Vec3,
    originScreen: { x: number; y: number },
    direction: Vec3,
    scaleX: number,
    scaleY: number,
): number
{
    const probe = projectWorldPoint(view, addScaled(origin, direction, 1));

    if (!probe)
    {
        return 0;
    }

    return Math.hypot(
        (probe.x - originScreen.x) * scaleX,
        (probe.y - originScreen.y) * scaleY,
    );
}

function gizmoWorldLength(
    view: NonNullable<PixiNode['_view3d']>,
    axes: AxesWorld,
    originScreen: { x: number; y: number },
    scaleX: number,
    scaleY: number,
): number
{
    const distance = cameraDistanceToWorld(view, axes.origin);
    const probeScreen = {
        x : originScreen.x + (AXIS_SCREEN_PX / (Math.abs(scaleX) > 1e-8 ? scaleX : 1)),
        y : originScreen.y,
    };
    const probeWorld = screenToWorldAtDistance(view, probeScreen, distance);

    if (probeWorld)
    {
        const len = Math.hypot(
            probeWorld.x - axes.origin.x,
            probeWorld.y - axes.origin.y,
            probeWorld.z - axes.origin.z,
        );

        if (len > 1e-6)
        {
            return len;
        }
    }

    const pxPerUnit = Math.max(
        projectedUnitPixels(view, axes.origin, originScreen, axes.x, scaleX, scaleY),
        projectedUnitPixels(view, axes.origin, originScreen, axes.y, scaleX, scaleY),
        projectedUnitPixels(view, axes.origin, originScreen, axes.z, scaleX, scaleY),
    );

    return pxPerUnit > 1e-4 ? AXIS_SCREEN_PX / pxPerUnit : 1;
}

export type GizmoLayoutInput = {
    dom: GizmoDom;
    node: PixiNode;
    view: NonNullable<PixiNode['_view3d']>;
    axes: AxesWorld;
    localAxes: AxesWorld;
    rect: DOMRect;
    scaleX: number;
    scaleY: number;
    mode: GizmoMode;
};

function layoutGizmoRoot(dom: GizmoDom, rect: DOMRect)
{
    dom.root.style.left = `${rect.left}px`;
    dom.root.style.top = `${rect.top}px`;
    dom.root.style.width = `${rect.width}px`;
    dom.root.style.height = `${rect.height}px`;
    dom.svg.setAttribute('width', String(rect.width));
    dom.svg.setAttribute('height', String(rect.height));
}

export function paintGizmoLayout(input: GizmoLayoutInput)
{
    const { dom, node, view, axes, localAxes, rect, scaleX, scaleY, mode } = input;
    const originScreen = projectWorldPoint(view, axes.origin);
    const aspectHint = rect.height > 1e-6 ? rect.width / rect.height : 16 / 9;

    if (!originScreen)
    {
        layoutGizmoRoot(dom, rect);
        hideTransformHandles(dom);

        const wire = paintNodeWireframe(dom, node, view, localAxes, scaleX, scaleY, aspectHint);

        if (wire.mode === 'helper' && wire.visible)
        {
            dom.root.style.display = 'block';
        }
        else
        {
            hideAllWireframes(dom);
            setGizmoVisible(dom, false);
        }

        return;
    }

    const worldLen = gizmoWorldLength(view, axes, originScreen, scaleX, scaleY);
    const ringRadius = worldLen * 0.85;

    mountModeBar(dom.modeBar);
    setGizmoVisible(dom, true);
    layoutGizmoRoot(dom, rect);
    paintNodeWireframe(dom, node, view, localAxes, scaleX, scaleY, aspectHint);

    const ox = originScreen.x * scaleX;
    const oy = originScreen.y * scaleY;

    dom.center.style.display = 'block';
    dom.center.setAttribute('cx', String(ox));
    dom.center.setAttribute('cy', String(oy));
    dom.uniformHit.setAttribute('cx', String(ox));
    dom.uniformHit.setAttribute('cy', String(oy));

    const showMoveScale = mode === 'move' || mode === 'scale';
    const showRotate = mode === 'rotate';
    const showMoveArrows = mode === 'move';
    const showScaleTips = mode === 'scale';

    (['x', 'y', 'z'] as const).forEach((axis) =>
    {
        const tipWorld = addScaled(axes.origin, axisDirOf(axes, axis), worldLen);
        const tipScreen = projectWorldPoint(view, tipWorld);
        const line = dom.axisLines[axis];
        const hit = dom.axisHits[axis];
        const arrow = dom.axisArrows[axis];
        const tip = dom.axisTips[axis];
        const ring = dom.rotateRings[axis];
        const ringHit = dom.rotateHits[axis];

        if (tipScreen && showMoveScale)
        {
            const tx = tipScreen.x * scaleX;
            const ty = tipScreen.y * scaleY;
            const arrowGeom = showMoveArrows ? arrowPolygonPoints(ox, oy, tx, ty) : null;
            const endX = arrowGeom ? arrowGeom.baseX : tx;
            const endY = arrowGeom ? arrowGeom.baseY : ty;

            line.setAttribute('x1', String(ox));
            line.setAttribute('y1', String(oy));
            line.setAttribute('x2', String(endX));
            line.setAttribute('y2', String(endY));
            hit.setAttribute('x1', String(ox));
            hit.setAttribute('y1', String(oy));
            hit.setAttribute('x2', String(tx));
            hit.setAttribute('y2', String(ty));
            line.style.display = 'block';
            hit.style.display = 'block';

            if (arrowGeom)
            {
                arrow.setAttribute('points', arrowGeom.points);
                arrow.style.display = 'block';
            }
            else
            {
                arrow.style.display = 'none';
            }

            if (showScaleTips)
            {
                tip.setAttribute('cx', String(tx));
                tip.setAttribute('cy', String(ty));
                tip.style.display = 'block';
            }
            else
            {
                tip.style.display = 'none';
            }
        }
        else
        {
            line.style.display = 'none';
            hit.style.display = 'none';
            arrow.style.display = 'none';
            tip.style.display = 'none';
        }

        if (showRotate)
        {
            const points = ringPoints(axes.origin, axisDirOf(axes, axis), ringRadius, view, scaleX, scaleY);

            ring.setAttribute('points', points);
            ringHit.setAttribute('points', points);
            ring.style.display = points ? 'block' : 'none';
            ringHit.style.display = points ? 'block' : 'none';
        }
        else
        {
            ring.style.display = 'none';
            ringHit.style.display = 'none';
        }
    });

    dom.uniformHit.style.display = mode === 'scale' ? 'block' : 'none';

    const showPlanes = mode === 'move';
    const cameraPos = readNodeGlobalPosition3D(view.camera as PixiNode) ?? axes.origin;
    const signs = cameraAxisSigns(axes, cameraPos);

    GIZMO_PLANE_IDS.forEach((plane) =>
    {
        const handle = dom.planeHandles[plane];

        if (!showPlanes)
        {
            handle.style.display = 'none';

            return;
        }

        const points = planeScreenPoints(view, axes, plane, signs, worldLen, scaleX, scaleY);

        if (!points)
        {
            handle.style.display = 'none';

            return;
        }

        handle.setAttribute('points', points);
        handle.style.display = 'block';
    });
}
