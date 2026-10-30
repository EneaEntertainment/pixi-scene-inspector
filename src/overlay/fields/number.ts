import { createFieldLabel, createFieldRoot, FIELD_CONTROL_FLEX } from './chrome';
import { attachNumberDrag, snapToStep } from './number-drag';

import type { FieldNumberKey } from '../properties/keys';
import type { NumberField, NumberFieldSpec } from './types';

export type NumberCommitInfo = {
    source: 'input' | 'scrub' | 'nudge';
    previous: number | undefined;
};

type NumberCommitHandler = (
    key: FieldNumberKey,
    value: number,
    info: NumberCommitInfo,
) => void;

export function formatNumber(value: number): string
{
    if (!Number.isFinite(value))
    {
        return '';
    }

    if (Math.abs(value) >= 1_000_000)
    {
        return String(Math.round(value));
    }

    const fixed = value.toFixed(6).replace(/\.?0+$/, '');

    return fixed === '-0' ? '0' : fixed;
}

function clampNumber(value: number, min: number | undefined, max: number | undefined): number
{
    let next = value;

    if (typeof min === 'number')
    {
        next = Math.max(min, next);
    }

    if (typeof max === 'number')
    {
        next = Math.min(max, next);
    }

    return next;
}

export function createNumberField(spec: NumberFieldSpec, onCommit: NumberCommitHandler): NumberField
{
    const root = createFieldRoot();
    const label = createFieldLabel(spec.label);
    const control = document.createElement('div');

    Object.assign(control.style, {
        flex         : FIELD_CONTROL_FLEX,
        position     : 'relative',
        display      : 'flex',
        alignItems   : 'stretch',
        minWidth     : '0',
        height       : '22px',
        borderRadius : '3px',
        background   : '#545454',
        overflow     : 'hidden',
        boxSizing    : 'border-box',
    });

    const input = document.createElement('input');

    input.type = 'text';
    input.inputMode = 'decimal';
    input.spellcheck = false;

    Object.assign(input.style, {
        flex       : '1',
        width      : '100%',
        minWidth   : '0',
        margin     : '0',
        padding    : '2px 18px',
        border     : '0',
        outline    : 'none',
        background : 'transparent',
        color      : '#e5e5e5',
        font       : 'inherit',
        fontSize   : '12px',
        textAlign  : 'center',
        boxSizing  : 'border-box',
    });

    const stepDown = document.createElement('button');
    const stepUp = document.createElement('button');

    stepDown.setAttribute('aria-label', `Decrease ${spec.label}`);
    stepUp.setAttribute('aria-label', `Increase ${spec.label}`);

    stepDown.type = 'button';
    stepUp.type = 'button';
    stepDown.textContent = '▾';
    stepUp.textContent = '▴';

    for (const btn of [stepDown, stepUp])
    {
        Object.assign(btn.style, {
            position       : 'absolute',
            top            : '0',
            bottom         : '0',
            width          : '16px',
            margin         : '0',
            padding        : '0',
            border         : '0',
            color          : '#fff',
            background     : 'transparent',
            fontSize       : '9px',
            lineHeight     : '1',
            cursor         : 'pointer',
            display        : 'none',
            alignItems     : 'center',
            justifyContent : 'center',
            zIndex         : '2',
        });
    }

    stepDown.style.left = '0';
    stepUp.style.right = '0';

    const dragLayer = document.createElement('div');

    Object.assign(dragLayer.style, {
        position    : 'absolute',
        inset       : '0',
        cursor      : 'ns-resize',
        zIndex      : '1',
        touchAction : 'pan-y',
    });

    control.appendChild(input);
    control.appendChild(dragLayer);
    control.appendChild(stepDown);
    control.appendChild(stepUp);
    root.appendChild(label);
    root.appendChild(control);

    let current: number | undefined;
    let focused = false;
    let hover = false;

    function syncChrome()
    {
        const showArrows = hover && !focused && !drag.isDragging();

        stepDown.style.display = showArrows ? 'flex' : 'none';
        stepUp.style.display = showArrows ? 'flex' : 'none';
        dragLayer.style.display = focused ? 'none' : 'block';

        if (focused || drag.isDragging())
        {
            control.style.background = '#222';
        }
        else if (hover)
        {
            control.style.background = '#656565';
        }
        else
        {
            control.style.background = '#545454';
        }
    }

    function setDisplay(value: number | undefined)
    {
        current = value;

        if (focused || drag.isDragging())
        {
            return;
        }

        input.value = value === undefined ? '' : formatNumber(value);
    }

    function commit(
        next: number,
        source: NumberCommitInfo['source'],
        previous: number | undefined = current,
    )
    {
        const clamped = clampNumber(next, spec.min, spec.max);

        current = clamped;
        input.value = formatNumber(clamped);

        onCommit(spec.key, clamped, { source, previous });
    }

    function nudge(direction: 1 | -1, snap = false)
    {
        const base = typeof current === 'number' ? current : 0;
        const next = base + (direction * spec.step);

        commit(snap ? snapToStep(next, spec.step) : next, 'nudge', base);
    }

    const drag = attachNumberDrag(dragLayer, {
        step         : spec.step,
        dragAccel    : spec.dragAccel,
        commit       : (value, previous) => commit(value, 'scrub', previous),
        getValue     : () => current,
        allowEmpty   : true,
        onSyncChrome : syncChrome,
        onClickFocus : () =>
        {
            input.focus();
        },
    });

    control.addEventListener('pointerenter', () =>
    {
        hover = true;

        syncChrome();
    });

    control.addEventListener('pointerleave', () =>
    {
        hover = false;

        syncChrome();
    });

    stepDown.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        nudge(-1, event.altKey);
    });

    stepUp.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        nudge(1, event.altKey);
    });

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

        const parsed = Number.parseFloat(input.value.trim());

        if (Number.isFinite(parsed))
        {
            commit(parsed, 'input');
        }
        else
        {
            input.value = current === undefined ? '' : formatNumber(current);
        }
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

            input.value = current === undefined ? '' : formatNumber(current);

            input.blur();
        }
        else if (event.key === 'ArrowUp')
        {
            event.preventDefault();
            nudge(1, event.altKey);
        }
        else if (event.key === 'ArrowDown')
        {
            event.preventDefault();
            nudge(-1, event.altKey);
        }
    });

    syncChrome();

    return {
        key: spec.key,
        root,

        setDisplay,

        isBusy: () => focused || drag.isDragging(),

        destroy: () =>
        {
            drag.destroy();
            root.remove();
        },
    };
}
