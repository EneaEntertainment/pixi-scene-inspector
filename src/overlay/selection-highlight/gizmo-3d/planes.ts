import type { AxesWorld } from '../geometry-3d';
import type { Vec3 } from '../math-3d';
import type { GizmoAxis, GizmoDragTarget, GizmoPlane } from './types';

export const GIZMO_PLANES = {
    xy : { normal: 'z', u: 'x', v: 'y' },
    xz : { normal: 'y', u: 'x', v: 'z' },
    yz : { normal: 'x', u: 'y', v: 'z' },
} as const satisfies Record<GizmoPlane, { normal: GizmoAxis; u: GizmoAxis; v: GizmoAxis }>;

export const GIZMO_PLANE_IDS = ['xy', 'xz', 'yz'] as const satisfies Array<GizmoPlane>;

export function isGizmoPlane(target: GizmoDragTarget): target is GizmoPlane
{
    return target === 'xy' || target === 'xz' || target === 'yz';
}

export function axisDirOf(axes: AxesWorld, axis: GizmoAxis): Vec3
{
    return axes[axis];
}
