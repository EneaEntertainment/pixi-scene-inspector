import { readCamera3D, setAsViewCamera, viewCameraStatus } from '../../page-ops/props-3d';
import { typeNameOf } from '../../page-ops/types';
import { createSection } from '../fields/section';
import { BUTTON_BG } from './constants';

import type { PixiNode } from '../../page-ops/pixi-node';

function cameraDisplayName(node: PixiNode): string
{
    if (typeof node.label === 'string' && node.label !== '')
    {
        return node.label;
    }

    if (typeof node.name === 'string' && node.name !== '')
    {
        return node.name;
    }

    const typeName = typeNameOf(node);

    return typeName || 'Camera3D';
}

function activeViewCameraName(node: PixiNode): string | null
{
    const camera = readCamera3D(node);
    const viewCamera = camera?._view3d?.camera;

    if (!viewCamera)
    {
        return null;
    }

    return cameraDisplayName(viewCamera);
}

export type CameraViewSection = {
    root: HTMLElement;
    sync: (node: PixiNode | null) => void;
    destroy: () => void;
};

type CreateCameraViewSectionOptions = {
    onChanged?: () => void;
};

export function createCameraViewSection(options: CreateCameraViewSectionOptions = {}): CameraViewSection
{
    const ui = createSection('View Camera', true);

    ui.root.style.display = 'none';

    const actions = document.createElement('div');

    Object.assign(actions.style, {
        display        : 'flex',
        justifyContent : 'center',
        gap            : '6px',
    });

    const useBtn = document.createElement('button');

    useBtn.type = 'button';
    useBtn.textContent = 'Use as view camera';

    Object.assign(useBtn.style, {
        height       : '24px',
        margin       : '0',
        padding      : '0 10px',
        border       : '0',
        borderRadius : '4px',
        appearance   : 'none',
        background   : BUTTON_BG,
        color        : '#ffffff',
        font         : 'inherit',
        fontSize     : '12px',
        cursor       : 'pointer',
        outline      : 'none',
        boxSizing    : 'border-box',
    });

    actions.append(useBtn);
    ui.body.append(actions);

    let boundNode: PixiNode | null = null;

    function hide()
    {
        boundNode = null;
        ui.root.style.display = 'none';

        ui.setTitle('View Camera');
    }

    function setButtonEnabled(enabled: boolean)
    {
        useBtn.disabled = !enabled;
        useBtn.style.opacity = enabled ? '1' : '0.55';
        useBtn.style.cursor = enabled ? 'pointer' : 'default';
    }

    function syncNode(node: PixiNode | null)
    {
        if (!node || !readCamera3D(node))
        {
            hide();

            return;
        }

        const activeName = activeViewCameraName(node);

        boundNode = node;
        ui.root.style.display = 'block';

        ui.setTitle(activeName ? `View Camera (${activeName})` : 'View Camera');
        setButtonEnabled(viewCameraStatus(node) === 'ready');
    }

    useBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        useBtn.blur();

        if (!boundNode)
        {
            return;
        }

        const ok = setAsViewCamera(boundNode);

        syncNode(boundNode);

        if (ok)
        {
            options.onChanged?.();
        }
    });

    return {
        root: ui.root,

        sync: (node) =>
        {
            try
            {
                syncNode(node);
            }
            catch
            {
                hide();
            }
        },

        destroy: () =>
        {
            hide();
            ui.root.remove();
        },
    };
}
