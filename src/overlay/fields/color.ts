import { cssColorToHex6 } from '../properties/text';
import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from './chrome';

import type { FieldStringKey } from '../properties/keys';
import type { ColorField, ColorFieldSpec } from './types';

export function createColorField(spec: ColorFieldSpec, onCommit: (key: FieldStringKey, value: string) => void): ColorField
{
    const root = createFieldRoot();
    const label = createFieldLabel(spec.label);
    const valueWrap = document.createElement('div');

    Object.assign(valueWrap.style, {
        flex       : FIELD_CONTROL_FLEX,
        minWidth   : '0',
        display    : 'flex',
        alignItems : 'center',
        gap        : '6px',
    });

    const swatchWrap = document.createElement('label');

    Object.assign(swatchWrap.style, {
        position     : 'relative',
        width        : '22px',
        height       : '22px',
        flex         : '0 0 auto',
        borderRadius : '3px',
        overflow     : 'hidden',
        border       : '1px solid #1f1f1f',
        boxSizing    : 'border-box',
        cursor       : 'pointer',
        background   : '#545454',
    });

    const swatch = document.createElement('input');

    swatch.type = 'color';
    swatch.value = '#000000';

    Object.assign(swatch.style, {
        position   : 'absolute',
        inset      : '0',
        width      : '100%',
        height     : '100%',
        margin     : '0',
        padding    : '0',
        border     : '0',
        outline    : 'none',
        cursor     : 'pointer',
        background : 'transparent',
    });

    const input = document.createElement('input');

    input.type = 'text';
    input.spellcheck = false;

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

    swatchWrap.appendChild(swatch);
    valueWrap.appendChild(swatchWrap);
    valueWrap.appendChild(input);
    root.appendChild(label);
    root.appendChild(valueWrap);

    let current = '';
    let focused = false;
    let picking = false;

    function syncChrome()
    {
        input.style.background = focused ? '#222' : '#545454';
    }

    function syncSwatch(value: string)
    {
        const hex = cssColorToHex6(value);

        if (hex)
        {
            swatch.value = hex;
        }
    }

    function commit(next: string)
    {
        current = next;
        input.value = next;

        syncSwatch(next);
        onCommit(spec.key, next);
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

    swatch.addEventListener('input', () =>
    {
        picking = true;

        commit(swatch.value);

        queueMicrotask(() =>
        {
            picking = false;
        });
    });

    syncChrome();
    syncSwatch('');

    return {
        key: spec.key,
        root,

        setDisplay: (value) =>
        {
            if (focused || picking)
            {
                return;
            }

            const next = typeof value === 'string' ? value : '';

            current = next;
            input.value = next;

            syncSwatch(next);
        },

        isBusy: () => focused || picking,

        destroy: () =>
        {
            root.remove();
        },
    };
}
