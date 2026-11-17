import { highlightTransformGesture } from '../../../gesture-active';
import { isNode3D } from '../../../page-ops/node-3d';
import {
    applyLocalAxisRotation,
    applyWorldAxisRotation,
    snapshotQuaternion,
    writeQuaternion,
} from '../../../page-ops/rotation-3d';
import { snapToStep } from '../../fields/number-drag';
import { writeTransformNumber } from '../../properties/transform-apply';
import { ANGLE_STEP_3D, POSITION_STEP_3D, SCALE_STEP_3D } from '../constants';
import {
    cameraDistanceToWorld,
    projectWorldPoint,
    rayFromScreen,
    readLocalAxesWorld,
    readNodeGlobalPosition3D,
    screenToWorldAtDistance,
    worldToParentLocal3D,
} from '../geometry-3d';
import { addScaled, cross3, dot3, normalize3, planeBasis, rayPlaneIntersection, sub3 } from '../math-3d';
import { restoreNodeKeys, snapshotNodeKeys } from '../transform-snapshot';
import { AXIS_SCREEN_PX } from './layout';
import { axisDirOf, GIZMO_PLANES, isGizmoPlane } from './planes';
import { scaleKey } from './property-keys';
import { resolveGizmoHandleAxes } from './space';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { QuaternionLike } from '../../../page-ops/rotation-3d';
import type { NumberPropertyKey } from '../../properties/node';
import type { Vec3 } from '../math-3d';
import type { CanvasMetrics, GizmoAxis, GizmoDragTarget, GizmoMode, GizmoSpace } from './types';

type DragState = {
    mode: GizmoMode;
    space: GizmoSpace;
    axis: GizmoDragTarget;
    pointerId: number;
    node: PixiNode;
    startValues: Map<NumberPropertyKey, number>;
    startQuat: QuaternionLike | null;
    origin: Vec3;
    axisDir: Vec3;
    startHit: Vec3;
    startAngle: number;
    startDist: number;
    planeNormal: Vec3;
};

function localAxisOf(axis: GizmoAxis): Vec3
{
    if (axis === 'x')
    {
        return { x: 1, y: 0, z: 0 };
    }

    if (axis === 'y')
    {
        return { x: 0, y: 1, z: 0 };
    }

    return { x: 0, y: 0, z: 1 };
}

export type GizmoDragHost = {
    resolveNode: () => PixiNode | null;
    getMode: () => GizmoMode;
    getSpace: () => GizmoSpace;
    getMetrics: () => CanvasMetrics | null;
};

export type GizmoDragController = {
    beginAxisDrag: (axis: GizmoDragTarget, event: PointerEvent) => void;
    cancel: () => void;
    end: () => void;
    isActive: () => boolean;
};

function clientToGlobal(
    rect: DOMRect,
    scaleX: number,
    scaleY: number,
    clientX: number,
    clientY: number,
): { x: number; y: number }
{
    return {
        x : (clientX - rect.left) / scaleX,
        y : (clientY - rect.top) / scaleY,
    };
}

function signedAngleAroundAxis(from: Vec3, axis: Vec3): number | null
{
    const basis = planeBasis(axis);

    if (!basis)
    {
        return null;
    }

    const projected = sub3(from, addScaled({ x: 0, y: 0, z: 0 }, axis, dot3(from, axis)));

    return Math.atan2(dot3(projected, basis.v), dot3(projected, basis.u));
}

function scaleRatioFromPixelDelta(deltaPx: number, startDist: number): number
{
    const sense = startDist < 0 ? -1 : 1;
    let ratio = 1 + ((sense * deltaPx) / AXIS_SCREEN_PX);

    if (!Number.isFinite(ratio))
    {
        return 1;
    }

    if (Math.abs(ratio) < 1e-6)
    {
        ratio = ratio < 0 ? -1e-6 : 1e-6;
    }

    return ratio;
}

export function createGizmoDrag(host: GizmoDragHost): GizmoDragController
{
    let drag: DragState | null = null;

    function endDrag()
    {
        if (!drag)
        {
            return;
        }

        drag = null;
        highlightTransformGesture.end();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('keydown', onDragKeyDown, true);
    }

    function cancelDrag()
    {
        if (!drag)
        {
            return;
        }

        if (drag.mode === 'rotate' && drag.startQuat)
        {
            writeQuaternion(drag.node, drag.startQuat);
        }
        else
        {
            restoreNodeKeys(drag.node, drag.startValues);
        }

        endDrag();
    }

    function applyDrag(clientX: number, clientY: number, snap: boolean)
    {
        const metrics = host.getMetrics();

        if (!drag || !metrics)
        {
            return;
        }

        const view = drag.node._view3d;

        if (!view)
        {
            return;
        }

        const { rect, scaleX, scaleY } = metrics;
        const screen = clientToGlobal(rect, scaleX, scaleY, clientX, clientY);

        if (drag.mode === 'move' && drag.axis !== 'uniform')
        {
            const ray = rayFromScreen(view, screen);
            const hit = ray
                ? rayPlaneIntersection(ray, drag.origin, drag.planeNormal)
                : screenToWorldAtDistance(
                    view,
                    screen,
                    cameraDistanceToWorld(view, drag.origin),
                );

            if (!hit)
            {
                return;
            }

            const delta = sub3(hit, drag.startHit);

            const world = isGizmoPlane(drag.axis)
                ? {
                    x : drag.origin.x + delta.x,
                    y : drag.origin.y + delta.y,
                    z : drag.origin.z + delta.z,
                }
                : addScaled(drag.origin, drag.axisDir, dot3(delta, drag.axisDir));

            const local = worldToParentLocal3D(drag.node, world);

            if (!local)
            {
                return;
            }

            const write = (key: NumberPropertyKey, value: number) =>
            {
                writeTransformNumber(
                    drag!.node,
                    key,
                    snap ? snapToStep(value, POSITION_STEP_3D) : value,
                );
            };

            write('position.x', local.x);
            write('position.y', local.y);
            write('position.z', local.z);

            return;
        }

        if (
            drag.mode === 'rotate'
            && (drag.axis === 'x' || drag.axis === 'y' || drag.axis === 'z')
            && drag.startQuat
        )
        {
            const ray = rayFromScreen(view, screen);
            const hit = ray
                ? rayPlaneIntersection(ray, drag.origin, drag.axisDir)
                : null;

            if (!hit)
            {
                return;
            }

            const angle = signedAngleAroundAxis(sub3(hit, drag.origin), drag.axisDir);

            if (angle === null)
            {
                return;
            }

            let deltaRad = angle - drag.startAngle;

            if (snap)
            {
                const deltaDeg = snapToStep(deltaRad * (180 / Math.PI), ANGLE_STEP_3D);

                deltaRad = deltaDeg * (Math.PI / 180);
            }

            const axis = localAxisOf(drag.axis);

            const next = drag.space === 'world'
                ? applyWorldAxisRotation(drag.startQuat, axis, deltaRad)
                : applyLocalAxisRotation(drag.startQuat, axis, deltaRad);

            writeQuaternion(drag.node, next);

            return;
        }

        if (drag.mode === 'scale' && !isGizmoPlane(drag.axis))
        {
            if (drag.axis === 'uniform')
            {
                const ratio = scaleRatioFromPixelDelta(
                    clientY - drag.startDist,
                    1,
                );

                (['scale.x', 'scale.y', 'scale.z'] as const).forEach((key) =>
                {
                    const start = drag!.startValues.get(key);

                    if (typeof start === 'number')
                    {
                        writeTransformNumber(
                            drag!.node,
                            key,
                            snap ? snapToStep(start * ratio, SCALE_STEP_3D) : start * ratio,
                        );
                    }
                });

                return;
            }

            const originScreen = projectWorldPoint(view, drag.origin);
            const tipScreen = projectWorldPoint(
                view,
                addScaled(drag.origin, drag.axisDir, 1),
            );

            if (!originScreen || !tipScreen)
            {
                return;
            }

            const cx = rect.left + (originScreen.x * scaleX);
            const cy = rect.top + (originScreen.y * scaleY);
            const axis2x = (tipScreen.x - originScreen.x) * scaleX;
            const axis2y = (tipScreen.y - originScreen.y) * scaleY;
            const len = Math.hypot(axis2x, axis2y);

            if (!(len > 1e-6))
            {
                return;
            }

            const ux = axis2x / len;
            const uy = axis2y / len;
            const dist = ((clientX - cx) * ux) + ((clientY - cy) * uy);

            if (drag.axis !== 'x' && drag.axis !== 'y' && drag.axis !== 'z')
            {
                return;
            }

            const key = scaleKey(drag.axis);
            const start = drag.startValues.get(key);

            if (typeof start !== 'number')
            {
                return;
            }

            const ratio = scaleRatioFromPixelDelta(dist - drag.startDist, drag.startDist);

            writeTransformNumber(
                drag.node,
                key,
                snap ? snapToStep(start * ratio, SCALE_STEP_3D) : start * ratio,
            );
        }
    }

    function onPointerMove(event: PointerEvent)
    {
        if (!drag || event.pointerId !== drag.pointerId)
        {
            return;
        }

        if ((event.buttons & 1) === 0)
        {
            applyDrag(event.clientX, event.clientY, event.altKey);
            endDrag();

            return;
        }

        applyDrag(event.clientX, event.clientY, event.altKey);
    }

    function onPointerUp(event: PointerEvent)
    {
        if (!drag || event.pointerId !== drag.pointerId)
        {
            return;
        }

        applyDrag(event.clientX, event.clientY, event.altKey);
        endDrag();
    }

    function onDragKeyDown(event: KeyboardEvent)
    {
        if (!drag)
        {
            return;
        }

        if (event.key === 'Escape')
        {
            event.preventDefault();
            event.stopImmediatePropagation();
            cancelDrag();
        }
    }

    function beginAxisDrag(axis: GizmoDragTarget, event: PointerEvent)
    {
        if (drag || event.button !== 0)
        {
            return;
        }

        const metrics = host.getMetrics();
        const node = host.resolveNode();
        const mode = host.getMode();
        const space = host.getSpace();
        const planeDrag = isGizmoPlane(axis);

        if (!node || !isNode3D(node) || !metrics)
        {
            return;
        }

        if (planeDrag && mode !== 'move')
        {
            return;
        }

        const view = node._view3d;
        const localAxes = readLocalAxesWorld(node);

        if (!view || !localAxes)
        {
            return;
        }

        const axes = resolveGizmoHandleAxes(localAxes, space, mode);

        const { rect, scaleX, scaleY } = metrics;
        const screen = clientToGlobal(rect, scaleX, scaleY, event.clientX, event.clientY);
        let axisDir: Vec3;

        if (axis === 'uniform')
        {
            axisDir = axes.x;
        }
        else if (planeDrag)
        {
            axisDir = axisDirOf(axes, GIZMO_PLANES[axis].normal);
        }
        else
        {
            axisDir = axisDirOf(axes, axis);
        }

        let keys: Array<NumberPropertyKey> = [];
        let startQuat: QuaternionLike | null = null;

        if (mode === 'move')
        {
            keys = ['position.x', 'position.y', 'position.z'];
        }
        else if (mode === 'rotate' && axis !== 'uniform' && !planeDrag)
        {
            startQuat = snapshotQuaternion(node);

            if (!startQuat)
            {
                return;
            }
        }
        else if (mode === 'scale' && (axis === 'uniform' || axis === 'x' || axis === 'y' || axis === 'z'))
        {
            keys = axis === 'uniform'
                ? ['scale.x', 'scale.y', 'scale.z']
                : [scaleKey(axis)];
        }

        const startValues = keys.length > 0
            ? snapshotNodeKeys(node, keys)
            : new Map<NumberPropertyKey, number>();

        if (mode !== 'rotate' && startValues.size === 0)
        {
            return;
        }

        const cam = readNodeGlobalPosition3D(view.camera as PixiNode) ?? axes.origin;
        const toCam = normalize3(sub3(cam, axes.origin)) ?? { x: 0, y: 0, z: 1 };
        let planeNormal: Vec3;

        if (planeDrag || mode === 'rotate')
        {
            planeNormal = axisDir;
        }
        else
        {
            planeNormal = normalize3(cross3(axisDir, cross3(axisDir, toCam)))
                ?? normalize3(cross3(axisDir, { x: 0, y: 1, z: 0 }))
                ?? { x: 0, y: 0, z: 1 };
        }

        const ray = rayFromScreen(view, screen);

        const startHit = ray
            ? rayPlaneIntersection(ray, axes.origin, planeNormal)
            : screenToWorldAtDistance(
                view,
                screen,
                cameraDistanceToWorld(view, axes.origin),
            );

        if (!startHit)
        {
            return;
        }

        let startAngle = 0;
        let startDist = 1;

        if (mode === 'rotate')
        {
            startAngle = signedAngleAroundAxis(sub3(startHit, axes.origin), axisDir) ?? 0;
        }

        if (mode === 'scale' && axis === 'uniform')
        {
            startDist = event.clientY;
        }
        else if (mode === 'scale' && !planeDrag)
        {
            const originScreen = projectWorldPoint(view, axes.origin);

            if (originScreen)
            {
                const tipScreen = projectWorldPoint(
                    view,
                    addScaled(axes.origin, axisDir, 1),
                );

                if (tipScreen)
                {
                    const cx = rect.left + (originScreen.x * scaleX);
                    const cy = rect.top + (originScreen.y * scaleY);
                    const axis2x = (tipScreen.x - originScreen.x) * scaleX;
                    const axis2y = (tipScreen.y - originScreen.y) * scaleY;
                    const len = Math.hypot(axis2x, axis2y);

                    if (len > 1e-6)
                    {
                        const screenAxisX = axis2x / len;
                        const screenAxisY = axis2y / len;

                        startDist = ((event.clientX - cx) * screenAxisX)
                            + ((event.clientY - cy) * screenAxisY);
                    }
                }
            }
        }

        drag = {
            mode,
            space,
            axis,
            pointerId : event.pointerId,
            node,
            startValues,
            startQuat,
            origin    : axes.origin,
            axisDir,
            startHit,
            startAngle,
            startDist,
            planeNormal,
        };

        highlightTransformGesture.begin();
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('keydown', onDragKeyDown, true);
        event.preventDefault();
        event.stopPropagation();
    }

    return {
        beginAxisDrag,
        cancel   : cancelDrag,
        end      : endDrag,
        isActive : () => drag !== null,
    };
}
