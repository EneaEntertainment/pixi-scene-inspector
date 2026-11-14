import { highlightStroke } from '../../../highlight-colors';
import { localBoundsScreenEdges, projectWorldEdge } from '../project-edge-3d';
import { ensureHelperLines } from './dom';
import { helperWorldEdges } from './helpers-3d';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { AxesWorld } from '../geometry-3d';
import type { GizmoDom } from './dom';
import type { WorldEdge } from './helpers-3d';

const HELPER_EDGE_MISS_LIMIT = 3;
const helperEdgeMisses = new WeakMap<SVGLineElement, number>();

function paintBoundsWireframe(
    dom: GizmoDom,
    node: PixiNode,
    view: NonNullable<PixiNode['_view3d']>,
    scaleX: number,
    scaleY: number,
)
{
    const stroke = highlightStroke();
    const edges = localBoundsScreenEdges(node, view, scaleX, scaleY);

    for (let i = 0; i < dom.boundsLines.length; i++)
    {
        const line = dom.boundsLines[i];
        const edge = edges[i];

        if (!line)
        {
            continue;
        }

        if (!edge)
        {
            line.style.display = 'none';

            continue;
        }

        line.setAttribute('x1', String(edge.x1));
        line.setAttribute('y1', String(edge.y1));
        line.setAttribute('x2', String(edge.x2));
        line.setAttribute('y2', String(edge.y2));
        line.style.stroke = stroke;
        line.style.display = 'block';
    }
}

export function hideBoundsWireframe(dom: GizmoDom)
{
    for (const line of dom.boundsLines)
    {
        line.style.display = 'none';
    }
}

export function hideHelperWireframe(dom: GizmoDom)
{
    for (const line of dom.helperLines)
    {
        line.style.display = 'none';
    }
}

export function hideAllWireframes(dom: GizmoDom)
{
    hideBoundsWireframe(dom);
    hideHelperWireframe(dom);
}

export function hideTransformHandles(dom: GizmoDom)
{
    dom.center.style.display = 'none';
    dom.uniformHit.style.display = 'none';
    dom.modeBar.style.display = 'none';

    (['x', 'y', 'z'] as const).forEach((axis) =>
    {
        dom.axisLines[axis].style.display = 'none';
        dom.axisHits[axis].style.display = 'none';
        dom.axisArrows[axis].style.display = 'none';
        dom.axisTips[axis].style.display = 'none';
        dom.rotateRings[axis].style.display = 'none';
        dom.rotateHits[axis].style.display = 'none';
    });
}

function paintHelperEdges(
    dom: GizmoDom,
    edges: Array<WorldEdge>,
    view: NonNullable<PixiNode['_view3d']>,
    scaleX: number,
    scaleY: number,
): boolean
{
    const stroke = highlightStroke();
    const lines = ensureHelperLines(dom, edges.length);
    let visible = false;

    for (let i = 0; i < lines.length; i++)
    {
        const line = lines[i];
        const edge = edges[i];

        if (!line)
        {
            continue;
        }

        if (!edge)
        {
            helperEdgeMisses.delete(line);
            line.style.display = 'none';

            continue;
        }

        const screen = projectWorldEdge(view, edge.a, edge.b, scaleX, scaleY);

        if (screen)
        {
            helperEdgeMisses.set(line, 0);
            line.setAttribute('x1', String(screen.x1));
            line.setAttribute('y1', String(screen.y1));
            line.setAttribute('x2', String(screen.x2));
            line.setAttribute('y2', String(screen.y2));
            line.style.stroke = stroke;
            line.style.display = 'block';
            visible = true;

            continue;
        }

        const misses = (helperEdgeMisses.get(line) ?? 0) + 1;

        helperEdgeMisses.set(line, misses);

        if (line.style.display === 'block' && misses < HELPER_EDGE_MISS_LIMIT)
        {
            visible = true;

            continue;
        }

        line.style.display = 'none';
    }

    return visible;
}

export function paintNodeWireframe(
    dom: GizmoDom,
    node: PixiNode,
    view: NonNullable<PixiNode['_view3d']>,
    axes: AxesWorld,
    scaleX: number,
    scaleY: number,
    aspectHint: number,
): { mode: 'helper' | 'bounds'; visible: boolean }
{
    const helperEdges = helperWorldEdges(node, view, axes, aspectHint);

    if (helperEdges)
    {
        hideBoundsWireframe(dom);

        return {
            mode    : 'helper',
            visible : paintHelperEdges(dom, helperEdges, view, scaleX, scaleY),
        };
    }

    hideHelperWireframe(dom);
    paintBoundsWireframe(dom, node, view, scaleX, scaleY);

    return { mode: 'bounds', visible: true };
}
