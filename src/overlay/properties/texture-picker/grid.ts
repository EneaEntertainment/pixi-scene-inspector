import { THUMB_SIZES } from './icons';

import type { CachedTextureEntry } from '../../../page-ops/texture';
import type { TexturePickerFlatViewMode } from './icons';
import type { TexturePickerLazyThumbs } from './lazy';

export function createTexturePickerThumb(
    entry: CachedTextureEntry,
    size: number,
    lazyThumbs: TexturePickerLazyThumbs,
): HTMLCanvasElement
{
    const canvas = document.createElement('canvas');

    Object.assign(canvas.style, {
        position      : 'relative',
        width         : `${size}px`,
        height        : `${size}px`,
        maxWidth      : `${size}px`,
        maxHeight     : `${size}px`,
        borderRadius  : '3px',
        background    : '#1a1a1a',
        flexShrink    : '0',
        display       : 'block',
        boxSizing     : 'border-box',
        pointerEvents : 'none',
    });

    lazyThumbs.observe(canvas, entry, size);

    return canvas;
}

export function createTexturePickerItem(
    entry: CachedTextureEntry,
    viewMode: TexturePickerFlatViewMode,
    currentName: string | undefined,
    onSelect: (name: string) => void,
    lazyThumbs: TexturePickerLazyThumbs,
): HTMLButtonElement
{
    const item = document.createElement('button');
    const selected = entry.name === currentName;

    item.type = 'button';
    item.title = entry.name;

    item.setAttribute('aria-label', entry.name);

    if (viewMode === 'list')
    {
        Object.assign(item.style, {
            display      : 'flex',
            alignItems   : 'center',
            alignSelf    : 'start',
            gap          : '8px',
            width        : '100%',
            minWidth     : '0',
            minHeight    : 'max-content',
            margin       : '0',
            padding      : '4px 6px',
            border       : selected ? '1px solid #4772b3' : '1px solid transparent',
            borderRadius : '4px',
            appearance   : 'none',
            background   : selected ? '#3a4a63' : '#3a3a3a',
            color        : '#e5e5e5',
            cursor       : 'pointer',
            boxSizing    : 'border-box',
            textAlign    : 'left',
            font         : 'inherit',
            fontSize     : '12px',
        });

        const label = document.createElement('span');

        label.textContent = entry.name;

        Object.assign(label.style, {
            flex          : '1',
            minWidth      : '0',
            overflow      : 'hidden',
            textOverflow  : 'ellipsis',
            whiteSpace    : 'nowrap',
            pointerEvents : 'none',
        });

        item.append(createTexturePickerThumb(entry, 28, lazyThumbs), label);
    }
    else
    {
        const size = THUMB_SIZES[viewMode];

        Object.assign(item.style, {
            display      : 'block',
            alignSelf    : 'start',
            margin       : '0',
            padding      : '6px',
            border       : selected ? '1px solid #4772b3' : '1px solid #555',
            borderRadius : '4px',
            appearance   : 'none',
            background   : selected ? '#3a4a63' : '#3a3a3a',
            color        : '#e5e5e5',
            cursor       : 'pointer',
            boxSizing    : 'border-box',
            font         : 'inherit',
            fontSize     : '11px',
            minWidth     : '0',
            minHeight    : 'max-content',
        });

        const stack = document.createElement('div');

        Object.assign(stack.style, {
            display       : 'flex',
            flexDirection : 'column',
            alignItems    : 'stretch',
            gap           : '4px',
            minWidth      : '0',
            width         : '100%',
        });

        const label = document.createElement('div');

        label.textContent = entry.name;

        Object.assign(label.style, {
            overflow      : 'hidden',
            textOverflow  : 'ellipsis',
            whiteSpace    : 'nowrap',
            textAlign     : 'center',
            color         : '#cfcfcf',
            lineHeight    : '1.2',
            flexShrink    : '0',
            pointerEvents : 'none',
        });

        const thumbWrap = document.createElement('div');

        Object.assign(thumbWrap.style, {
            display        : 'flex',
            alignItems     : 'center',
            justifyContent : 'center',
            width          : '100%',
            height         : `${size}px`,
            flexShrink     : '0',
            pointerEvents  : 'none',
        });

        thumbWrap.appendChild(createTexturePickerThumb(entry, size, lazyThumbs));
        stack.append(thumbWrap, label);
        item.appendChild(stack);
    }

    item.addEventListener('pointerenter', () =>
    {
        if (entry.name === currentName)
        {
            return;
        }

        item.style.background = '#484848';
    });

    item.addEventListener('pointerleave', () =>
    {
        item.style.background = entry.name === currentName ? '#3a4a63' : '#3a3a3a';
    });

    item.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        onSelect(entry.name);
    });

    return item;
}

export function applyTexturePickerGridLayout(grid: HTMLElement, viewMode: TexturePickerFlatViewMode)
{
    Object.assign(grid.style, {
        display            : 'grid',
        flexDirection      : 'row',
        overflowX          : 'hidden',
        overflowY          : 'auto',
        overscrollBehavior : 'contain',
        touchAction        : 'pan-y',
    });

    if (viewMode === 'list')
    {
        Object.assign(grid.style, {
            gridTemplateColumns : '1fr',
            gridAutoRows        : 'max-content',
            gap                 : '4px',
        });

        return;
    }

    const size = THUMB_SIZES[viewMode];
    const minCol = size + 24;

    Object.assign(grid.style, {
        gridTemplateColumns : `repeat(auto-fill, minmax(${minCol}px, 1fr))`,
        gridAutoRows        : 'max-content',
        gap                 : '8px',
    });
}
