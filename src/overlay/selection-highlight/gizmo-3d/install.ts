import { isEditableKeyTarget } from '../../../editable-keys';
import { isNode3D } from '../../../page-ops/node-3d';
import { readLocalAxesWorld } from '../geometry-3d';
import { createGizmoDom, setGizmoVisible, setModeButtonsActive, setSpaceButtonActive } from './dom';
import { createGizmoDrag } from './drag';
import { paintGizmoLayout } from './layout';
import { GIZMO_PLANE_IDS } from './planes';
import { resolveGizmoHandleAxes } from './space';
import { hideAllWireframes } from './wireframe';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { CanvasMetrics, Gizmo3DController, GizmoMode, GizmoSpace } from './types';

export function installGizmo3D(resolveNode: () => PixiNode | null): Gizmo3DController
{
    const dom = createGizmoDom();
    let mode: GizmoMode = 'move';
    let space: GizmoSpace = 'local';
    let destroyed = false;
    let metrics: CanvasMetrics | null = null;

    function setMode(next: GizmoMode)
    {
        mode = next;

        setModeButtonsActive(dom, mode);
    }

    function setSpace(next: GizmoSpace)
    {
        space = next;

        setSpaceButtonActive(dom, space);
    }

    function toggleSpace()
    {
        setSpace(space === 'local' ? 'world' : 'local');
    }

    function hide()
    {
        hideAllWireframes(dom);
        setGizmoVisible(dom, false);
    }

    const drag = createGizmoDrag({
        resolveNode,
        getMode    : () => mode,
        getSpace   : () => space,
        getMetrics : () => metrics,
    });

    function sync(next: CanvasMetrics | null)
    {
        if (destroyed)
        {
            return;
        }

        metrics = next;

        const node = resolveNode();

        if (!next || !node || !isNode3D(node))
        {
            if (!drag.isActive())
            {
                hide();
            }

            return;
        }

        const view = node._view3d;
        const localAxes = readLocalAxesWorld(node);

        if (!view || !localAxes)
        {
            hide();

            return;
        }

        if (view.camera === node)
        {
            hide();

            return;
        }

        if (!(next.rect.width > 0) || !(next.rect.height > 0))
        {
            hide();

            return;
        }

        paintGizmoLayout({
            dom,
            node,
            view,
            axes   : resolveGizmoHandleAxes(localAxes, space, mode),
            localAxes,
            rect   : next.rect,
            scaleX : next.scaleX,
            scaleY : next.scaleY,
            mode,
        });
    }

    function onModeKey(event: KeyboardEvent)
    {
        if (destroyed || isEditableKeyTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey)
        {
            return;
        }

        const key = event.key.toLowerCase();

        if (key === 'w')
        {
            setMode('move');
            event.preventDefault();
        }
        else if (key === 'e')
        {
            setMode('rotate');
            event.preventDefault();
        }
        else if (key === 'r')
        {
            setMode('scale');
            event.preventDefault();
        }
        else if (key === 'x')
        {
            toggleSpace();
            event.preventDefault();
        }
    }

    (['x', 'y', 'z'] as const).forEach((axis) =>
    {
        const start = (event: PointerEvent) => drag.beginAxisDrag(axis, event);

        dom.axisHits[axis].addEventListener('pointerdown', start);
        dom.axisArrows[axis].addEventListener('pointerdown', start);
        dom.axisTips[axis].addEventListener('pointerdown', start);
        dom.rotateHits[axis].addEventListener('pointerdown', start);
    });

    GIZMO_PLANE_IDS.forEach((plane) =>
    {
        dom.planeHandles[plane].addEventListener('pointerdown', (event) =>
        {
            drag.beginAxisDrag(plane, event);
        });
    });

    dom.uniformHit.addEventListener('pointerdown', (event) => drag.beginAxisDrag('uniform', event));
    dom.modeButtons.move.addEventListener('click', () => setMode('move'));
    dom.modeButtons.rotate.addEventListener('click', () => setMode('rotate'));
    dom.modeButtons.scale.addEventListener('click', () => setMode('scale'));
    dom.spaceButton.addEventListener('click', () => toggleSpace());
    window.addEventListener('keydown', onModeKey, true);

    return {
        sync,

        cancel: () =>
        {
            drag.cancel();
            hide();
        },

        destroy: () =>
        {
            destroyed = true;
            drag.end();
            window.removeEventListener('keydown', onModeKey, true);
            dom.modeBar.remove();
            dom.root.remove();
        },
    };
}
