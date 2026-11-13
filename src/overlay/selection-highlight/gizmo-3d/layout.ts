import {
    cameraDistanceToWorld,
    projectWorldPoint,
    screenToWorldAtDistance,
} from '../geometry-3d';
import { addScaled, cross3, normalize3 } from '../math-3d';
import { setGizmoVisible } from './dom';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { Vec3 } from '../math-3d';
import type { GizmoDom } from './dom';
import type { GizmoAxis, GizmoMode } from './types';

export const AXIS_SCREEN_PX = 72;
const ARROW_LENGTH_PX = 10;
const ARROW_HALF_WIDTH_PX = 5;
const RING_SEGMENTS = 48;
const SHELL_ID = 'pixi-scene-inspector-shell';

type AxesWorld = {
    origin: Vec3;
    x: Vec3;
    y: Vec3;
    z: Vec3;
};

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

export function planeBasis(axis: Vec3): { u: Vec3; v: Vec3 } | null
{
    const ref = Math.abs(axis.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const u = normalize3(cross3(axis, ref));
    const v = u ? normalize3(cross3(axis, u)) : null;

    if (!u || !v)
    {
        return null;
    }

    return { u, v };
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

function axisDirOf(axes: AxesWorld, axis: GizmoAxis): Vec3
{
    return axes[axis];
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
    view: NonNullable<PixiNode['_view3d']>;
    axes: AxesWorld;
    rect: DOMRect;
    scaleX: number;
    scaleY: number;
    mode: GizmoMode;
};

export function paintGizmoLayout(input: GizmoLayoutInput)
{
    const { dom, view, axes, rect, scaleX, scaleY, mode } = input;
    const originScreen = projectWorldPoint(view, axes.origin);

    if (!originScreen)
    {
        setGizmoVisible(dom, false);

        return;
    }

    const worldLen = gizmoWorldLength(view, axes, originScreen, scaleX, scaleY);
    const ringRadius = worldLen * 0.85;

    mountModeBar(dom.modeBar);
    setGizmoVisible(dom, true);
    dom.root.style.left = `${rect.left}px`;
    dom.root.style.top = `${rect.top}px`;
    dom.root.style.width = `${rect.width}px`;
    dom.root.style.height = `${rect.height}px`;
    dom.svg.setAttribute('width', String(rect.width));
    dom.svg.setAttribute('height', String(rect.height));

    const ox = originScreen.x * scaleX;
    const oy = originScreen.y * scaleY;

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
}
