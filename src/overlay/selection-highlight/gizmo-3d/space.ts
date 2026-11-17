import { worldAxesAt } from '../geometry-3d';

import type { AxesWorld } from '../geometry-3d';
import type { GizmoMode, GizmoSpace } from './types';

export function resolveGizmoHandleAxes(
    localAxes: AxesWorld,
    space: GizmoSpace,
    mode: GizmoMode,
): AxesWorld
{
    return space === 'world' && mode !== 'scale'
        ? worldAxesAt(localAxes.origin)
        : localAxes;
}
