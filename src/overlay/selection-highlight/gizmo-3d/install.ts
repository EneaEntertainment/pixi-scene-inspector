import { isEditableKeyTarget } from '../../../editable-keys';
import { isNode3D } from '../../../page-ops/node-3d';
import { readLocalAxesWorld } from '../geometry-3d';
import { createGizmoDom, setGizmoVisible, setModeButtonsActive } from './dom';
import { createGizmoDrag } from './drag';
import { paintGizmoLayout } from './layout';

import type { PixiNode } from '../../../page-ops/pixi-node';
import type { CanvasMetrics, Gizmo3DController, GizmoMode } from './types';

export function installGizmo3D(resolveNode: () => PixiNode | null): Gizmo3DController
{
    const dom = createGizmoDom();
    let mode: GizmoMode = 'move';
    let destroyed = false;
    let metrics: CanvasMetrics | null = null;

    function setMode(next: GizmoMode)
    {
        mode = next;
        setModeButtonsActive(dom, mode);
    }

    function hide()
    {
        setGizmoVisible(dom, false);
    }

    const drag = createGizmoDrag({
        resolveNode,
        getMode    : () => mode,
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
        const axes = readLocalAxesWorld(node);

        if (!view || !axes || view.camera === node)
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
            view,
            axes,
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
    }

    (['x', 'y', 'z'] as const).forEach((axis) =>
    {
        const start = (event: PointerEvent) => drag.beginAxisDrag(axis, event);

        dom.axisHits[axis].addEventListener('pointerdown', start);
        dom.axisArrows[axis].addEventListener('pointerdown', start);
        dom.axisTips[axis].addEventListener('pointerdown', start);
        dom.rotateHits[axis].addEventListener('pointerdown', start);
    });

    dom.uniformHit.addEventListener('pointerdown', (event) => drag.beginAxisDrag('uniform', event));
    dom.modeButtons.move.addEventListener('click', () => setMode('move'));
    dom.modeButtons.rotate.addEventListener('click', () => setMode('rotate'));
    dom.modeButtons.scale.addEventListener('click', () => setMode('scale'));
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
