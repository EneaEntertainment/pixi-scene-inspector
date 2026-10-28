import { truncateLabel } from '../layout';
import { CUSTOM_LABEL_COLOR, resolveNodeTypeStyle } from '../node-type-config';

import type { LaidOutNode } from '../types';

const INVISIBLE_DARKEN_FACTOR = 0.7;

function darkenHex(hex: string, factor: number): string
{
    const raw = hex.startsWith('#') ? hex.slice(1) : hex;

    if (raw.length !== 6)
    {
        return hex;
    }

    const r = Math.round(parseInt(raw.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(raw.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(raw.slice(4, 6), 16) * factor);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function fullLabel(node: LaidOutNode): string
{
    if (node.label)
    {
        return node.label;
    }

    return resolveNodeTypeStyle(node.typeName).short;
}

export function displayLabel(node: LaidOutNode): string
{
    const label = fullLabel(node);

    return node.label ? truncateLabel(label) : label;
}

export function labelColor(node: LaidOutNode, rootId: string | null): string
{
    let color = resolveNodeTypeStyle(node.typeName).color;

    if (node.label && rootId !== null && rootId !== undefined && node.id === rootId)
    {
        color = CUSTOM_LABEL_COLOR;
    }

    if (!node.visible)
    {
        return darkenHex(color, INVISIBLE_DARKEN_FACTOR);
    }

    return color;
}
