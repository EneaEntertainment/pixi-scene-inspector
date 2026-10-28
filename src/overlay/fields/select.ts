import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from './chrome';

import type { FieldStringKey } from '../properties/keys';
import type { SelectField, SelectFieldSpec } from './types';

export function createSelectField(spec: SelectFieldSpec, onCommit: (key: FieldStringKey, value: string) => void): SelectField
{
    const root = createFieldRoot();
    const label = createFieldLabel(spec.label);
    const select = document.createElement('select');

    Object.assign(select.style, {
        flex         : FIELD_CONTROL_FLEX,
        minWidth     : '0',
        height       : '22px',
        margin       : '0',
        padding      : '0 4px',
        border       : '0',
        borderRadius : '3px',
        outline      : 'none',
        background   : '#2a2a2a',
        color        : '#e5e5e5',
        font         : 'inherit',
        fontSize     : '12px',
        boxSizing    : 'border-box',
        cursor       : 'pointer',
    });

    const emptyOption = document.createElement('option');

    emptyOption.value = '';
    emptyOption.textContent = '';

    function rebuildOptions(current: string)
    {
        select.replaceChildren();

        const showEmpty = spec.allowEmpty === true
            || current === ''
            || !spec.options.some((option) => option.value === current);

        if (showEmpty)
        {
            select.appendChild(emptyOption);
        }

        for (const optionSpec of spec.options)
        {
            const option = document.createElement('option');

            option.value = optionSpec.value;
            option.textContent = optionSpec.label;

            select.appendChild(option);
        }

        if (
            current !== ''
            && !spec.options.some((option) => option.value === current)
        )
        {
            const custom = document.createElement('option');

            custom.value = current;
            custom.textContent = current;

            select.appendChild(custom);
        }

        select.value = current;
    }

    rebuildOptions('');
    root.appendChild(label);
    root.appendChild(select);

    let busy = false;
    let current = '';

    select.addEventListener('change', () =>
    {
        busy = true;
        current = select.value;

        onCommit(spec.key, current);

        queueMicrotask(() =>
        {
            busy = false;
        });
    });

    return {
        key: spec.key,
        root,

        setDisplay: (value) =>
        {
            if (busy)
            {
                return;
            }

            const next = typeof value === 'string' ? value : '';

            if (next === current && select.value === next)
            {
                return;
            }

            current = next;

            rebuildOptions(next);
        },

        isBusy: () => busy,

        destroy: () =>
        {
            root.remove();
        },
    };
}
