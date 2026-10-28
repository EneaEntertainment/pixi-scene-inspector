import { cssColorToHex6 } from '../properties/text';
import { closeIconSvg } from '../shell/panel-icons';
import { formatNumber } from './number';
import { attachNumberDrag } from './number-drag';

import type { FillColorStop, TextFillPropertyKey } from '../properties/text';
import type { FillStopsField, FillStopsFieldSpec } from './types';

const OFFSET_STEP = 0.01;
const OFFSET_DRAG_ACCEL = 0.1;

function cloneFillStops(stops: Array<FillColorStop>): Array<FillColorStop>
{
    return stops.map((stop) => ({ color: stop.color, offset: stop.offset }));
}

function canonicalStopColor(value: string): string
{
    const direct = cssColorToHex6(value);

    if (direct)
    {
        return direct;
    }

    const bare = value.trim();

    if (
        (/^[0-9a-fA-F]{3}$/).test(bare)
        || (/^[0-9a-fA-F]{6}$/).test(bare)
        || (/^[0-9a-fA-F]{8}$/).test(bare)
    )
    {
        const hex = bare.length === 3 ? bare : bare.slice(0, 6);

        return cssColorToHex6(`#${hex}`) ?? `#${hex.toLowerCase()}`;
    }

    return bare.toLowerCase();
}

function sameFillStops(left: Array<FillColorStop>, right: Array<FillColorStop>): boolean
{
    if (left.length !== right.length)
    {
        return false;
    }

    return left.every((stop, index) =>
        canonicalStopColor(stop.color) === canonicalStopColor(right[index].color)
        && Math.abs(stop.offset - right[index].offset) < 0.0001);
}

function parseOffsetInput(value: string): number | null
{
    const trimmed = value.trim().replace(',', '.');

    if (trimmed === '')
    {
        return null;
    }

    const parsed = Number.parseFloat(trimmed);

    if (!Number.isFinite(parsed))
    {
        return null;
    }

    return Math.max(0, Math.min(1, parsed));
}

export function createFillStopsField(
    spec: FillStopsFieldSpec,
    onCommit: (key: TextFillPropertyKey, value: Array<FillColorStop>) => void,
): FillStopsField
{
    const root = document.createElement('div');

    Object.assign(root.style, {
        display       : 'flex',
        flexDirection : 'column',
        gap           : '6px',
        minWidth      : '0',
    });

    const list = document.createElement('div');

    Object.assign(list.style, {
        display       : 'flex',
        flexDirection : 'column',
        gap           : '6px',
        minWidth      : '0',
    });

    const addButton = document.createElement('button');

    addButton.type = 'button';
    addButton.textContent = '+ Add Color';

    Object.assign(addButton.style, {
        width        : '100%',
        height       : '26px',
        margin       : '0',
        padding      : '0 8px',
        border       : '1px dashed #6a6a6a',
        borderRadius : '3px',
        outline      : 'none',
        background   : '#3f3f3f',
        color        : '#d6d6d6',
        font         : 'inherit',
        fontSize     : '11px',
        cursor       : 'pointer',
        boxSizing    : 'border-box',
    });

    root.appendChild(list);
    root.appendChild(addButton);

    let current: Array<FillColorStop> = [];
    let busyCount = 0;
    let picking = false;
    let offsetDragging = false;
    let rowCleanups: Array<() => void> = [];

    function beginBusy()
    {
        busyCount += 1;
    }

    function endBusy()
    {
        busyCount = Math.max(0, busyCount - 1);
    }

    function commit(next: Array<FillColorStop>, rebuild: boolean)
    {
        beginBusy();
        current = cloneFillStops(next);
        try
        {
            onCommit(spec.key, cloneFillStops(next));

            if (rebuild)
            {
                renderRows();
            }
        }
        finally
        {
            endBusy();
        }
    }

    function clearRows()
    {
        for (const cleanup of rowCleanups)
        {
            cleanup();
        }

        rowCleanups = [];
        offsetDragging = false;

        list.replaceChildren();
    }

    function renderRows()
    {
        clearRows();

        current.forEach((stop, index) =>
        {
            const row = document.createElement('div');

            Object.assign(row.style, {
                display    : 'flex',
                alignItems : 'center',
                gap        : '6px',
                minWidth   : '0',
                minHeight  : '22px',
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
            swatch.value = cssColorToHex6(stop.color) ?? '#000000';

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

            const colorInput = document.createElement('input');

            colorInput.type = 'text';
            colorInput.spellcheck = false;
            colorInput.value = stop.color;

            Object.assign(colorInput.style, {
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

            const offsetControl = document.createElement('div');

            Object.assign(offsetControl.style, {
                position     : 'relative',
                flex         : '0 0 48px',
                width        : '48px',
                height       : '22px',
                borderRadius : '3px',
                background   : '#545454',
                overflow     : 'hidden',
                boxSizing    : 'border-box',
            });

            const offsetInput = document.createElement('input');

            offsetInput.type = 'text';
            offsetInput.inputMode = 'decimal';
            offsetInput.spellcheck = false;

            offsetInput.value = formatNumber(stop.offset);

            Object.assign(offsetInput.style, {
                width      : '100%',
                height     : '100%',
                margin     : '0',
                padding    : '2px 4px',
                border     : '0',
                outline    : 'none',
                background : 'transparent',
                color      : '#e5e5e5',
                font       : 'inherit',
                fontSize   : '12px',
                textAlign  : 'center',
                boxSizing  : 'border-box',
            });

            const offsetDragLayer = document.createElement('div');

            Object.assign(offsetDragLayer.style, {
                position    : 'absolute',
                inset       : '0',
                cursor      : 'ns-resize',
                zIndex      : '1',
                touchAction : 'pan-y',
            });

            const removeButton = document.createElement('button');

            removeButton.setAttribute('aria-label', 'Remove color');

            removeButton.type = 'button';
            removeButton.innerHTML = closeIconSvg(10);
            removeButton.disabled = current.length <= 1;

            Object.assign(removeButton.style, {
                flex           : '0 0 22px',
                width          : '22px',
                height         : '22px',
                margin         : '0',
                padding        : '0',
                border         : '0',
                borderRadius   : '3px',
                outline        : 'none',
                background     : current.length <= 1 ? '#4a3a3a' : '#5a3030',
                color          : current.length <= 1 ? '#8a6a6a' : '#ff8a8a',
                cursor         : current.length <= 1 ? 'default' : 'pointer',
                display        : 'inline-flex',
                alignItems     : 'center',
                justifyContent : 'center',
                boxSizing      : 'border-box',
            });

            let offsetFocused = false;
            let offsetHover = false;

            function syncColorChrome(focused: boolean)
            {
                colorInput.style.background = focused ? '#222' : '#545454';
            }

            function syncOffsetChrome()
            {
                const dragging = offsetDrag.isDragging();

                offsetDragLayer.style.display = offsetFocused ? 'none' : 'block';

                if (offsetFocused || dragging)
                {
                    offsetControl.style.background = '#222';
                }
                else if (offsetHover)
                {
                    offsetControl.style.background = '#656565';
                }
                else
                {
                    offsetControl.style.background = '#545454';
                }
            }

            function commitOffset(value: number)
            {
                const clamped = Math.max(0, Math.min(1, value));
                const next = cloneFillStops(current);

                next[index] = { ...next[index], offset: clamped };
                offsetInput.value = formatNumber(clamped);
                commit(next, false);
            }

            const offsetDrag = attachNumberDrag(offsetDragLayer, {
                step         : OFFSET_STEP,
                dragAccel    : OFFSET_DRAG_ACCEL,
                getValue     : () => current[index]?.offset,
                commit       : commitOffset,
                onSyncChrome : () =>
                {
                    offsetDragging = offsetDrag.isDragging();
                    syncOffsetChrome();
                },
                onClickFocus: () =>
                {
                    offsetInput.focus();
                },
            });

            colorInput.addEventListener('focus', () =>
            {
                beginBusy();
                syncColorChrome(true);
                colorInput.select();
            });

            colorInput.addEventListener('blur', () =>
            {
                syncColorChrome(false);

                const next = cloneFillStops(current);

                next[index] = { ...next[index], color: colorInput.value };

                commit(next, false);
                endBusy();
            });

            colorInput.addEventListener('keydown', (event) =>
            {
                if (event.key === 'Enter')
                {
                    event.preventDefault();
                    colorInput.blur();
                }
                else if (event.key === 'Escape')
                {
                    event.preventDefault();

                    colorInput.value = current[index]?.color ?? '';

                    colorInput.blur();
                }
            });

            offsetControl.addEventListener('pointerenter', () =>
            {
                offsetHover = true;
                syncOffsetChrome();
            });

            offsetControl.addEventListener('pointerleave', () =>
            {
                offsetHover = false;
                syncOffsetChrome();
            });

            offsetInput.addEventListener('focus', () =>
            {
                beginBusy();
                offsetFocused = true;
                syncOffsetChrome();
                offsetInput.select();
            });

            offsetInput.addEventListener('blur', () =>
            {
                offsetFocused = false;
                syncOffsetChrome();

                const parsed = parseOffsetInput(offsetInput.value);

                if (parsed !== null)
                {
                    commitOffset(parsed);
                }
                else
                {
                    offsetInput.value = formatNumber(current[index]?.offset ?? 0);
                }

                endBusy();
            });

            offsetInput.addEventListener('keydown', (event) =>
            {
                if (event.key === 'Enter')
                {
                    event.preventDefault();
                    offsetInput.blur();
                }
                else if (event.key === 'Escape')
                {
                    event.preventDefault();

                    offsetInput.value = formatNumber(current[index]?.offset ?? 0);

                    offsetInput.blur();
                }
                else if (event.key === 'ArrowUp')
                {
                    event.preventDefault();

                    const value = current[index]?.offset;

                    if (typeof value === 'number')
                    {
                        commitOffset(value + OFFSET_STEP);
                    }
                }
                else if (event.key === 'ArrowDown')
                {
                    event.preventDefault();

                    const value = current[index]?.offset;

                    if (typeof value === 'number')
                    {
                        commitOffset(value - OFFSET_STEP);
                    }
                }
            });

            swatch.addEventListener('input', () =>
            {
                picking = true;

                const next = cloneFillStops(current);

                next[index] = { ...next[index], color: swatch.value };
                colorInput.value = swatch.value;

                commit(next, false);

                queueMicrotask(() =>
                {
                    picking = false;
                });
            });

            removeButton.addEventListener('click', () =>
            {
                if (current.length <= 1)
                {
                    return;
                }

                const next = cloneFillStops(current);

                next.splice(index, 1);
                commit(next, true);
            });

            offsetControl.appendChild(offsetInput);
            offsetControl.appendChild(offsetDragLayer);
            swatchWrap.appendChild(swatch);
            row.appendChild(swatchWrap);
            row.appendChild(colorInput);
            row.appendChild(offsetControl);
            row.appendChild(removeButton);
            list.appendChild(row);

            syncOffsetChrome();
            rowCleanups.push(() =>
            {
                offsetDrag.destroy();
            });
        });
    }

    addButton.addEventListener('mouseenter', () =>
    {
        addButton.style.background = '#484848';
    });

    addButton.addEventListener('mouseleave', () =>
    {
        addButton.style.background = '#3f3f3f';
    });

    addButton.addEventListener('click', () =>
    {
        const next = cloneFillStops(current);

        if (next.length === 0)
        {
            next.push({ color: '#ffffff', offset: 0 });
        }
        else if (next.length === 1)
        {
            next[0] = { ...next[0], offset: 0 };

            next.push({ color: next[0].color, offset: 1 });
        }
        else
        {
            next.push({
                color  : next[next.length - 1].color,
                offset : 1,
            });
        }

        commit(next, true);
    });

    renderRows();

    return {
        key: spec.key,
        root,

        setDisplay: (value) =>
        {
            if (busyCount > 0 || picking || offsetDragging)
            {
                return;
            }

            const next = Array.isArray(value) ? cloneFillStops(value) : [];

            if (sameFillStops(current, next))
            {
                return;
            }

            current = next;

            renderRows();
        },

        isBusy: () => busyCount > 0 || picking || offsetDragging,

        destroy: () =>
        {
            clearRows();
            root.remove();
        },
    };
}
