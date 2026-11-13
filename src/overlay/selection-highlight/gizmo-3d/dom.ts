import type { GizmoMode } from './types';

const GIZMO_OVERLAY_ID = 'pixi-scene-inspector-gizmo-3d';

const AXIS_COLORS = {
    x : '#ef4444',
    y : '#22c55e',
    z : '#3b82f6',
} as const;

export type GizmoDom = {
    root: HTMLDivElement;
    svg: SVGSVGElement;
    modeBar: HTMLDivElement;
    modeButtons: Record<GizmoMode, HTMLButtonElement>;
    boundsLines: Array<SVGLineElement>;
    axisLines: Record<'x' | 'y' | 'z', SVGLineElement>;
    axisHits: Record<'x' | 'y' | 'z', SVGLineElement>;
    axisArrows: Record<'x' | 'y' | 'z', SVGPolygonElement>;
    axisTips: Record<'x' | 'y' | 'z', SVGCircleElement>;
    rotateRings: Record<'x' | 'y' | 'z', SVGPolylineElement>;
    rotateHits: Record<'x' | 'y' | 'z', SVGPolylineElement>;
    uniformHit: SVGCircleElement;
    center: SVGCircleElement;
};

function svgEl<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K]
{
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}

function styleModeButton(button: HTMLButtonElement, active: boolean)
{
    Object.assign(button.style, {
        border        : active ? '1px solid #e2e8f0' : '1px solid #475569',
        background    : active ? '#334155' : '#1e293b',
        color         : active ? '#f8fafc' : '#94a3b8',
        font          : '11px ui-monospace, SFMono-Regular, Menlo, monospace',
        padding       : '2px 6px',
        borderRadius  : '4px',
        cursor        : 'pointer',
        pointerEvents : 'auto',
    });
}

export function createGizmoDom(): GizmoDom
{
    document.getElementById(GIZMO_OVERLAY_ID)?.remove();

    const root = document.createElement('div');

    root.id = GIZMO_OVERLAY_ID;

    Object.assign(root.style, {
        position      : 'fixed',
        left          : '0',
        top           : '0',
        width         : '0',
        height        : '0',
        overflow      : 'visible',
        pointerEvents : 'none',
        zIndex        : '2147483641',
        display       : 'none',
    });

    const svg = svgEl('svg');

    Object.assign(svg.style, {
        position      : 'absolute',
        left          : '0',
        top           : '0',
        overflow      : 'visible',
        pointerEvents : 'none',
    });

    const boundsLines: Array<SVGLineElement> = [];

    for (let i = 0; i < 12; i++)
    {
        const line = svgEl('line');

        Object.assign(line.style, {
            stroke        : '#38bdf8',
            strokeWidth   : '1.5',
            fill          : 'none',
            pointerEvents : 'none',
            display       : 'none',
        });
        line.setAttribute('stroke-dasharray', '4 3');
        boundsLines.push(line);
        svg.appendChild(line);
    }

    const axisLines = {
        x : svgEl('line'),
        y : svgEl('line'),
        z : svgEl('line'),
    };
    const axisHits = {
        x : svgEl('line'),
        y : svgEl('line'),
        z : svgEl('line'),
    };
    const axisArrows = {
        x : svgEl('polygon'),
        y : svgEl('polygon'),
        z : svgEl('polygon'),
    };
    const axisTips = {
        x : svgEl('circle'),
        y : svgEl('circle'),
        z : svgEl('circle'),
    };
    const rotateRings = {
        x : svgEl('polyline'),
        y : svgEl('polyline'),
        z : svgEl('polyline'),
    };
    const rotateHits = {
        x : svgEl('polyline'),
        y : svgEl('polyline'),
        z : svgEl('polyline'),
    };

    (['x', 'y', 'z'] as const).forEach((axis) =>
    {
        const color = AXIS_COLORS[axis];

        Object.assign(axisLines[axis].style, { stroke: color, strokeWidth: '2', fill: 'none' });
        Object.assign(axisHits[axis].style, {
            stroke        : 'transparent',
            strokeWidth   : '12',
            fill          : 'none',
            pointerEvents : 'stroke',
            cursor        : 'grab',
        });
        axisArrows[axis].setAttribute('fill', color);
        Object.assign(axisArrows[axis].style, { pointerEvents: 'auto', cursor: 'grab' });
        axisTips[axis].setAttribute('r', '5');
        axisTips[axis].setAttribute('fill', color);
        Object.assign(axisTips[axis].style, { pointerEvents: 'auto', cursor: 'grab' });

        Object.assign(rotateRings[axis].style, {
            stroke      : color,
            strokeWidth : '2',
            fill        : 'none',
        });
        rotateRings[axis].setAttribute('fill', 'none');
        Object.assign(rotateHits[axis].style, {
            stroke        : 'transparent',
            strokeWidth   : '12',
            fill          : 'none',
            pointerEvents : 'stroke',
            cursor        : 'grab',
        });

        svg.appendChild(axisHits[axis]);
        svg.appendChild(rotateHits[axis]);
        svg.appendChild(axisLines[axis]);
        svg.appendChild(rotateRings[axis]);
        svg.appendChild(axisArrows[axis]);
        svg.appendChild(axisTips[axis]);
    });

    const uniformHit = svgEl('circle');

    uniformHit.setAttribute('r', '7');
    uniformHit.setAttribute('fill', '#f8fafc');
    Object.assign(uniformHit.style, { pointerEvents: 'auto', cursor: 'nwse-resize' });

    const center = svgEl('circle');

    center.setAttribute('r', '3');
    center.setAttribute('fill', '#f8fafc');
    Object.assign(center.style, { pointerEvents: 'none' });

    svg.appendChild(uniformHit);
    svg.appendChild(center);

    const modeBar = document.createElement('div');

    Object.assign(modeBar.style, {
        position      : 'absolute',
        display       : 'none',
        gap           : '4px',
        pointerEvents : 'none',
        right         : '8px',
        top           : '8px',
        left          : 'auto',
        zIndex        : '10',
    });

    const modeButtons = {
        move   : document.createElement('button'),
        rotate : document.createElement('button'),
        scale  : document.createElement('button'),
    };

    modeButtons.move.textContent = 'W move';
    modeButtons.rotate.textContent = 'E rotate';
    modeButtons.scale.textContent = 'R scale';

    (Object.keys(modeButtons) as Array<GizmoMode>).forEach((mode) =>
    {
        const button = modeButtons[mode];

        button.type = 'button';
        styleModeButton(button, mode === 'move');
        modeBar.appendChild(button);
    });

    root.appendChild(svg);
    document.body.appendChild(root);

    return {
        root,
        svg,
        modeBar,
        modeButtons,
        boundsLines,
        axisLines,
        axisHits,
        axisArrows,
        axisTips,
        rotateRings,
        rotateHits,
        uniformHit,
        center,
    };
}

export function setModeButtonsActive(dom: GizmoDom, mode: GizmoMode)
{
    (Object.keys(dom.modeButtons) as Array<GizmoMode>).forEach((key) =>
    {
        styleModeButton(dom.modeButtons[key], key === mode);
    });
}

export function setGizmoVisible(dom: GizmoDom, visible: boolean)
{
    dom.root.style.display = visible ? 'block' : 'none';
    dom.modeBar.style.display = visible ? 'flex' : 'none';
}
