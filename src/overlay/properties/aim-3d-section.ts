import { isAimable3D, nodeLookAt } from '../../page-ops/props-3d';
import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from '../fields/chrome';
import { formatNumber } from '../fields/number';
import { createSection } from '../fields/section';
import { BUTTON_BG } from './constants';

import type { PixiNode } from '../../page-ops/pixi-node';

export type Aim3DSection = {
    root: HTMLElement;
    sync: (node: PixiNode | null) => void;
    destroy: () => void;
};

const INPUT_STYLE: Record<string, string> = {
    flex         : '1',
    minWidth     : '0',
    width        : '100%',
    height       : '22px',
    margin       : '0',
    padding      : '0 4px',
    border       : '0',
    borderRadius : '3px',
    outline      : 'none',
    background   : '#545454',
    color        : '#e5e5e5',
    font         : 'inherit',
    fontSize     : '12px',
    boxSizing    : 'border-box',
    textAlign    : 'center',
};

function createAxisInput(axis: string): HTMLInputElement
{
    const input = document.createElement('input');

    input.type = 'text';
    input.inputMode = 'decimal';
    input.spellcheck = false;
    input.setAttribute('aria-label', `lookAt ${axis}`);
    input.value = '0';

    Object.assign(input.style, INPUT_STYLE);

    return input;
}

function parseAxis(value: string): number | undefined
{
    const trimmed = value.trim();

    if (trimmed === '')
    {
        return undefined;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : undefined;
}

export function createAim3DSection(): Aim3DSection
{
    const ui = createSection('Aim', true);

    ui.root.style.display = 'none';

    const targetRow = createFieldRoot();
    const label = createFieldLabel('lookAt');
    const axes = document.createElement('div');

    Object.assign(axes.style, {
        flex       : FIELD_CONTROL_FLEX,
        display    : 'flex',
        gap        : '4px',
        minWidth   : '0',
        alignItems : 'stretch',
    });

    const inputX = createAxisInput('x');
    const inputY = createAxisInput('y');
    const inputZ = createAxisInput('z');

    axes.append(inputX, inputY, inputZ);
    targetRow.append(label, axes);

    const actions = document.createElement('div');

    Object.assign(actions.style, {
        display        : 'flex',
        justifyContent : 'flex-end',
        gap            : '6px',
    });

    const applyBtn = document.createElement('button');

    applyBtn.type = 'button';
    applyBtn.textContent = 'Apply';

    Object.assign(applyBtn.style, {
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

    applyBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        applyBtn.blur();
        applyLookAt();
    });

    actions.append(applyBtn);
    ui.body.append(targetRow, actions);

    let boundNode: PixiNode | null = null;

    function hide()
    {
        boundNode = null;
        ui.root.style.display = 'none';
    }

    function applyLookAt()
    {
        if (!boundNode)
        {
            return;
        }

        const x = parseAxis(inputX.value);
        const y = parseAxis(inputY.value);
        const z = parseAxis(inputZ.value);

        if (x === undefined || y === undefined || z === undefined)
        {
            return;
        }

        if (nodeLookAt(boundNode, { x, y, z }))
        {
            inputX.value = formatNumber(x);
            inputY.value = formatNumber(y);
            inputZ.value = formatNumber(z);
        }
    }

    function syncNode(node: PixiNode | null)
    {
        if (!node || !isAimable3D(node))
        {
            hide();

            return;
        }

        boundNode = node;
        ui.root.style.display = 'block';
    }

    for (const input of [inputX, inputY, inputZ])
    {
        input.addEventListener('keydown', (event) =>
        {
            if (event.key === 'Enter')
            {
                event.preventDefault();
                applyLookAt();
                input.blur();
            }
            else if (event.key === 'Escape')
            {
                event.preventDefault();
                input.blur();
            }
        });
    }

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
