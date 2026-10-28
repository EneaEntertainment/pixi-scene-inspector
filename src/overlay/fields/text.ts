import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from './chrome';

import type { FieldStringKey } from '../properties/keys';
import type { TextField, TextFieldSpec } from './types';

export function createTextField(spec: TextFieldSpec, onCommit: (key: FieldStringKey, value: string) => void): TextField
{
    const root = createFieldRoot();
    const label = createFieldLabel(spec.label);
    const input = document.createElement('input');

    input.type = 'text';
    input.spellcheck = false;

    Object.assign(input.style, {
        flex         : FIELD_CONTROL_FLEX,
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

    root.appendChild(label);
    root.appendChild(input);

    let current = '';
    let focused = false;

    function syncChrome()
    {
        input.style.background = focused ? '#222' : '#545454';
    }

    function commit(next: string)
    {
        current = next;
        input.value = next;

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

    syncChrome();

    return {
        key: spec.key,
        root,

        setDisplay: (value) =>
        {
            if (focused)
            {
                return;
            }

            const next = typeof value === 'string' ? value : '';

            current = next;
            input.value = next;
        },

        isBusy: () => focused,

        destroy: () =>
        {
            root.remove();
        },
    };
}
