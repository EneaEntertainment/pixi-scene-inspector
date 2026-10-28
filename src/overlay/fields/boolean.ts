import type { FieldBooleanKey } from '../properties/keys';
import type { BooleanField, BooleanFieldSpec } from './types';

export function createBooleanField(
    spec: BooleanFieldSpec,
    onCommit: (key: FieldBooleanKey, value: boolean) => void,
): BooleanField
{
    const root = document.createElement('label');

    Object.assign(root.style, {
        display    : 'flex',
        alignItems : 'center',
        gap        : '8px',
        minHeight  : '22px',
        cursor     : 'pointer',
        userSelect : 'none',
    });

    const spacer = document.createElement('div');

    Object.assign(spacer.style, { flex: '1' });

    const valueWrap = document.createElement('div');

    Object.assign(valueWrap.style, {
        flex       : '2',
        display    : 'flex',
        alignItems : 'center',
        gap        : '6px',
    });

    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';

    Object.assign(checkbox.style, {
        width       : '14px',
        height      : '14px',
        margin      : '0',
        accentColor : '#4772b3',
        cursor      : 'pointer',
    });

    const label = document.createElement('span');

    label.textContent = spec.label;

    Object.assign(label.style, {
        fontSize : '11px',
        color    : '#cfcfcf',
    });

    valueWrap.appendChild(checkbox);
    valueWrap.appendChild(label);
    root.appendChild(spacer);
    root.appendChild(valueWrap);

    let busy = false;

    checkbox.addEventListener('change', () =>
    {
        busy = true;

        onCommit(spec.key, checkbox.checked);

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

            checkbox.checked = value === true;
            checkbox.indeterminate = value === undefined;
            checkbox.disabled = value === undefined;
        },

        isBusy: () => busy,

        destroy: () =>
        {
            root.remove();
        },
    };
}
