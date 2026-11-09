import { isNodeAlive } from '../../page-ops/pixi-node';
import {
    hasExposedTextureCache,
    nodeHasTexture,
    nodeTextureName,
    setNodeTextureByName,
} from '../../page-ops/texture';
import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from '../fields/chrome';
import { createSection } from '../fields/section';
import { BUTTON_BG } from './constants';
import { openTexturePickerDialog } from './texture-picker';

import type { PixiNode } from '../../page-ops/pixi-node';
import type { TexturePickerDialog } from './texture-picker';

export type TextureSection = {
    root: HTMLElement;
    sync: (node: PixiNode | null, multi?: boolean) => void;
    destroy: () => void;
};

export function createTextureSection(onExportClick: () => void): TextureSection
{
    const ui = createSection('Texture', true, onExportClick);

    const textureRow = createFieldRoot();
    const textureLabel = createFieldLabel('texture');
    const controlWrap = document.createElement('div');
    const textureInput = document.createElement('input');
    const browseBtn = document.createElement('button');

    textureInput.type = 'text';
    textureInput.spellcheck = false;
    textureInput.setAttribute('aria-label', 'texture');

    Object.assign(controlWrap.style, {
        flex       : FIELD_CONTROL_FLEX,
        minWidth   : '0',
        display    : 'flex',
        alignItems : 'center',
        gap        : '4px',
    });

    Object.assign(textureInput.style, {
        flex         : '1',
        minWidth     : '0',
        height       : '22px',
        margin       : '0',
        padding      : '2px 6px',
        border       : '0',
        borderRadius : '3px',
        outline      : 'none',
        background   : '#545454',
        color        : '#e5e5e5',
        font         : 'inherit',
        fontSize     : '12px',
        boxSizing    : 'border-box',
    });

    browseBtn.type = 'button';
    browseBtn.textContent = '…';
    browseBtn.title = 'Browse texture cache';

    browseBtn.setAttribute('aria-label', 'Browse texture cache');

    Object.assign(browseBtn.style, {
        flexShrink     : '0',
        display        : 'none',
        alignItems     : 'center',
        justifyContent : 'center',
        width          : '22px',
        height         : '22px',
        margin         : '0',
        padding        : '0',
        border         : '0',
        borderRadius   : '3px',
        appearance     : 'none',
        background     : BUTTON_BG,
        color          : '#ffffff',
        font           : 'inherit',
        fontSize       : '12px',
        fontWeight     : '700',
        lineHeight     : '1',
        cursor         : 'pointer',
        boxSizing      : 'border-box',
    });

    controlWrap.append(textureInput, browseBtn);
    textureRow.append(textureLabel, controlWrap);
    ui.body.appendChild(textureRow);

    ui.root.style.display = 'none';

    let boundNode: PixiNode | null = null;
    let current = '';
    let focused = false;
    let activePicker: TexturePickerDialog | null = null;

    function syncChrome()
    {
        textureInput.style.background = focused ? '#222' : '#545454';
    }

    function syncBrowseVisibility()
    {
        const showBrowse = hasExposedTextureCache();

        browseBtn.style.display = showBrowse ? 'flex' : 'none';

        if (!showBrowse)
        {
            activePicker?.close();

            activePicker = null;
        }
    }

    function hide()
    {
        boundNode = null;
        current = '';
        textureInput.value = '';
        focused = false;

        syncChrome();

        browseBtn.style.display = 'none';
        ui.root.style.display = 'none';
    }

    function commit(next: string)
    {
        const trimmed = next.trim();

        if (!isNodeAlive(boundNode))
        {
            hide();

            return;
        }

        if (trimmed === current)
        {
            textureInput.value = current;

            return;
        }

        const ok = setNodeTextureByName(boundNode, trimmed);

        if (!ok)
        {
            textureInput.value = current;

            return;
        }

        current = nodeTextureName(boundNode);
        textureInput.value = current;
    }

    function syncNode(node: PixiNode | null, multi = false)
    {
        if (multi || !nodeHasTexture(node))
        {
            hide();

            return;
        }

        boundNode = node;

        syncBrowseVisibility();

        if (focused)
        {
            ui.root.style.display = 'block';

            ui.setExportEnabled(true);

            return;
        }

        current = nodeTextureName(node);
        textureInput.value = current;
        ui.root.style.display = 'block';

        ui.setExportEnabled(true);
    }

    function openPicker()
    {
        if (!isNodeAlive(boundNode) || !hasExposedTextureCache())
        {
            return;
        }

        activePicker?.close();

        activePicker = openTexturePickerDialog({
            currentName: current,

            onSelect: (name) =>
            {
                if (!isNodeAlive(boundNode))
                {
                    hide();

                    return;
                }

                const ok = setNodeTextureByName(boundNode, name);

                if (!ok)
                {
                    return;
                }

                current = nodeTextureName(boundNode);
                textureInput.value = current;
            },

            onClose: () =>
            {
                activePicker = null;
            },
        });
    }

    textureInput.addEventListener('focus', () =>
    {
        focused = true;

        syncChrome();
        textureInput.select();
    });

    textureInput.addEventListener('blur', () =>
    {
        focused = false;

        syncChrome();
        commit(textureInput.value);
    });

    textureInput.addEventListener('keydown', (event) =>
    {
        if (event.key === 'Enter')
        {
            event.preventDefault();
            textureInput.blur();
        }
        else if (event.key === 'Escape')
        {
            event.preventDefault();

            textureInput.value = current;
            textureInput.blur();
        }
    });

    browseBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        browseBtn.blur();
        openPicker();
    });

    syncChrome();

    return {
        root: ui.root,

        sync: (node, multi) =>
        {
            try
            {
                syncNode(node, multi);
            }
            catch
            {
                hide();
            }
        },

        destroy: () =>
        {
            activePicker?.close();
            activePicker = null;

            hide();
            ui.root.remove();
        },
    };
}
