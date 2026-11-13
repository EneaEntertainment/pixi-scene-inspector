import { hasExposedTextureCache } from '../../page-ops/texture';
import { BUTTON_BG } from '../properties/constants';
import { openTexturePickerDialog } from '../properties/texture-picker';
import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from './chrome';

import type { FieldStringKey } from '../properties/keys';
import type { TexturePickerDialog } from '../properties/texture-picker';
import type { TextureField, TextureFieldSpec } from './types';

export function createTextureField(
    spec: TextureFieldSpec,
    onCommit: (key: FieldStringKey, value: string) => string | null,
): TextureField
{
    const root = createFieldRoot();
    const label = createFieldLabel(spec.label);
    const controlWrap = document.createElement('div');
    const input = document.createElement('input');
    const browseBtn = document.createElement('button');

    input.type = 'text';
    input.spellcheck = false;
    input.setAttribute('aria-label', spec.label);

    Object.assign(controlWrap.style, {
        flex       : FIELD_CONTROL_FLEX,
        minWidth   : '0',
        display    : 'flex',
        alignItems : 'center',
        gap        : '4px',
    });

    Object.assign(input.style, {
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
    browseBtn.setAttribute('aria-label', `Browse texture cache for ${spec.label}`);

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

    controlWrap.append(input, browseBtn);
    root.append(label, controlWrap);

    let current = '';
    let focused = false;
    let activePicker: TexturePickerDialog | null = null;

    function syncChrome()
    {
        input.style.background = focused ? '#222' : '#545454';
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

    function commit(raw: string)
    {
        const trimmed = raw.trim();

        if (trimmed === current)
        {
            input.value = current;

            return;
        }

        const resolved = onCommit(spec.key, trimmed);

        if (resolved === null)
        {
            input.value = current;

            return;
        }

        current = resolved;
        input.value = current;
    }

    function openPicker()
    {
        if (!hasExposedTextureCache())
        {
            return;
        }

        activePicker?.close();

        activePicker = openTexturePickerDialog({
            currentName: current,

            onSelect: (name) =>
            {
                const resolved = onCommit(spec.key, name);

                if (resolved === null)
                {
                    return;
                }

                current = resolved;
                input.value = current;
            },

            onClose: () =>
            {
                activePicker = null;
            },
        });
    }

    input.addEventListener('focus', () =>
    {
        focused = true;
        syncChrome();
        input.select();
    });

    input.addEventListener('blur', () =>
    {
        focused = false;
        syncChrome();
        commit(input.value);
    });

    input.addEventListener('keydown', (event) =>
    {
        if (event.key === 'Enter')
        {
            event.preventDefault();
            input.blur();
        }
        else if (event.key === 'Escape')
        {
            event.preventDefault();
            input.value = current;
            input.blur();
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
    syncBrowseVisibility();

    return {
        key: spec.key,
        root,

        setDisplay: (value) =>
        {
            syncBrowseVisibility();

            if (focused)
            {
                return;
            }

            const next = typeof value === 'string' ? value : '';

            current = next;
            input.value = next;
        },

        isBusy: () => focused || !!activePicker,

        destroy: () =>
        {
            activePicker?.close();
            activePicker = null;
            root.remove();
        },
    };
}
