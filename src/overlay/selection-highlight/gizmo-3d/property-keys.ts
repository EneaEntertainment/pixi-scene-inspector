import type { NumberPropertyKey } from '../../properties/node';
import type { GizmoAxis } from './types';

export function scaleKey(axis: GizmoAxis): NumberPropertyKey
{
    if (axis === 'x')
    {
        return 'scale.x';
    }

    if (axis === 'y')
    {
        return 'scale.y';
    }

    return 'scale.z';
}
