import { isolateEditableKeyEvents } from '../../../editable-keys';
import { texturePickerGesture } from '../../../gesture-active';
import { listCachedTextures } from '../../../page-ops/texture';
import { createDialogCloseButton } from '../../shell/dialog-close-button';
import { createFilterField } from '../../shell/filter-field';
import { clampFloatRect, FLOAT_CORNER_SIZE } from '../../shell/float-rect';
import { attachFloatRectMove, attachFloatRectResize } from '../../shell/float-rect-drag';
import {
    readTexturePickerRect,
    readTexturePickerViewMode,
    writeTexturePickerRect,
    writeTexturePickerViewMode,
} from '../../shell/settings';
import { createTexturePickerColumns } from './columns';
import {
    applyTexturePickerGridLayout,
    createTexturePickerItem,
} from './grid';
import { viewIconSvg } from './icons';
import { createTexturePickerLazyThumbs } from './lazy';
import { attachTexturePickerWheel } from './wheel';

import type { PageGlobals } from '../../../page-ops/pixi-node';
import type { CachedTextureEntry } from '../../../page-ops/texture';
import type { FilterField } from '../../shell/filter-field';
import type { FloatRect } from '../../shell/float-rect';
import type { TexturePickerColumns } from './columns';
import type { TexturePickerFlatViewMode, TexturePickerViewMode } from './icons';
import type { TexturePickerLazyThumbs } from './lazy';

export type TexturePickerDialog = {
    close: () => void;
};

type TexturePickerOptions = {
    currentName?: string;
    onSelect: (name: string) => void;
    onClose?: () => void;
};

const DEFAULT_WIDTH = 1176;
const DEFAULT_HEIGHT = 528;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

function matchesFilter(name: string, filter: string): boolean
{
    if (filter === '')
    {
        return true;
    }

    return name.toLowerCase().includes(filter);
}

function viewportSize(): { width: number; height: number }
{
    return {
        width  : window.innerWidth,
        height : window.innerHeight,
    };
}

function defaultRect(): FloatRect
{
    const { width: viewportW, height: viewportH } = viewportSize();
    const width = Math.min(DEFAULT_WIDTH, Math.max(MIN_WIDTH, viewportW - 24));
    const height = Math.min(DEFAULT_HEIGHT, Math.max(MIN_HEIGHT, viewportH - 24));

    return {
        left : Math.round((viewportW - width) / 2),
        top  : Math.round((viewportH - height) / 2),
        width,
        height,
    };
}

function clampPickerRect(rect: FloatRect): FloatRect
{
    const { width: viewportW, height: viewportH } = viewportSize();

    return clampFloatRect(rect, {
        viewportW,
        viewportH,
        minWidth   : MIN_WIDTH,
        minHeight  : MIN_HEIGHT,
        clampWidth : (width, maxW) => Math.min(Math.max(width, MIN_WIDTH), Math.max(MIN_WIDTH, maxW)),
    });
}

export function openTexturePickerDialog(options: TexturePickerOptions): TexturePickerDialog
{
    const win = globalThis as PageGlobals;
    const entries = listCachedTextures(win);
    let viewMode: TexturePickerViewMode = readTexturePickerViewMode() ?? 'thumb-md';
    let filter = '';
    let closed = false;
    let stopEditableKeys: (() => void) | null = null;
    let stopWheel: (() => void) | null = null;
    let lazyThumbs: TexturePickerLazyThumbs | null = null;
    let listColumns: TexturePickerColumns | null = null;
    let usingListColumns = false;
    const dragCleanups: Array<() => void> = [];

    let floatRect = clampPickerRect(readTexturePickerRect() ?? defaultRect());

    const overlay = document.createElement('div');

    Object.assign(overlay.style, {
        position   : 'fixed',
        inset      : '0',
        zIndex     : '2147483647',
        background : 'rgba(0, 0, 0, 0.45)',
        fontFamily : 'ui-sans-serif, system-ui, sans-serif',
    });

    const dialog = document.createElement('div');

    Object.assign(dialog.style, {
        position      : 'fixed',
        left          : `${floatRect.left}px`,
        top           : `${floatRect.top}px`,
        width         : `${floatRect.width}px`,
        height        : `${floatRect.height}px`,
        display       : 'flex',
        flexDirection : 'column',
        gap           : '10px',
        padding       : '12px',
        borderRadius  : '6px',
        background    : '#2f2f2f',
        border        : '1px solid #555',
        boxShadow     : '0 8px 24px rgba(0, 0, 0, 0.45)',
        color         : '#e5e5e5',
        fontSize      : '12px',
        boxSizing     : 'border-box',
        overflow      : 'hidden',
    });

    function applyRect()
    {
        dialog.style.left = `${floatRect.left}px`;
        dialog.style.top = `${floatRect.top}px`;
        dialog.style.width = `${floatRect.width}px`;
        dialog.style.height = `${floatRect.height}px`;
    }

    function persistRect()
    {
        writeTexturePickerRect(floatRect);
    }

    const header = document.createElement('div');

    Object.assign(header.style, {
        display     : 'flex',
        alignItems  : 'center',
        gap         : '8px',
        minWidth    : '0',
        cursor      : 'move',
        userSelect  : 'none',
        touchAction : 'none',
    });

    const heading = document.createElement('div');

    Object.assign(heading.style, {
        flex          : '1',
        minWidth      : '0',
        fontSize      : '12px',
        letterSpacing : '0.02em',
        overflow      : 'hidden',
        textOverflow  : 'ellipsis',
        whiteSpace    : 'nowrap',
    });

    const currentLabel = options.currentName?.trim();

    if (currentLabel)
    {
        const nameEl = document.createElement('span');

        nameEl.textContent = currentLabel;
        nameEl.style.fontWeight = '700';

        const hintEl = document.createElement('span');

        hintEl.textContent = ' (select a replacement texture)';
        hintEl.style.fontWeight = '400';

        heading.append(nameEl, hintEl);
    }
    else
    {
        heading.textContent = 'Select texture';
        heading.style.fontWeight = '700';
    }

    const closeBtn = createDialogCloseButton(() =>
    {
        close();
    });

    header.append(heading, closeBtn);

    const toolbar = document.createElement('div');

    Object.assign(toolbar.style, {
        display    : 'flex',
        alignItems : 'center',
        gap        : '8px',
        minWidth   : '0',
    });

    let filterField: FilterField | null = createFilterField({
        placeholder : 'filter…',
        ariaLabel   : 'Filter textures',

        onChange: (value) =>
        {
            filter = value;

            renderItems();
        },
    });

    const viewToggle = document.createElement('div');

    Object.assign(viewToggle.style, {
        display      : 'flex',
        flexShrink   : '0',
        border       : '1px solid #555',
        borderRadius : '4px',
        overflow     : 'hidden',
        boxSizing    : 'border-box',
    });

    const viewButtons = new Map<TexturePickerViewMode, HTMLButtonElement>();

    function makeViewButton(mode: TexturePickerViewMode, title: string): HTMLButtonElement
    {
        const button = document.createElement('button');

        button.type = 'button';
        button.title = title;
        button.innerHTML = viewIconSvg(mode);

        button.setAttribute('aria-label', title);

        Object.assign(button.style, {
            display        : 'flex',
            alignItems     : 'center',
            justifyContent : 'center',
            width          : '28px',
            height         : '26px',
            margin         : '0',
            padding        : '0',
            border         : '0',
            borderRadius   : '0',
            appearance     : 'none',
            background     : '#3a3a3a',
            color          : '#bdbdbd',
            cursor         : 'pointer',
            boxSizing      : 'border-box',
        });

        button.addEventListener('click', (event) =>
        {
            event.preventDefault();
            event.stopPropagation();
            setViewMode(mode);
        });

        viewButtons.set(mode, button);
        viewToggle.appendChild(button);

        return button;
    }

    makeViewButton('thumb-sm', 'Small thumbnails');
    makeViewButton('thumb-md', 'Medium thumbnails');
    makeViewButton('thumb-lg', 'Large thumbnails');
    makeViewButton('list', 'List');
    makeViewButton('list-miller', 'Columns');

    toolbar.append(filterField.root, viewToggle);

    const status = document.createElement('div');

    Object.assign(status.style, {
        color     : '#9a9a9a',
        fontSize  : '11px',
        minHeight : '14px',
    });

    const grid = document.createElement('div');

    Object.assign(grid.style, {
        flex               : '1',
        minHeight          : '0',
        overflowX          : 'hidden',
        overflowY          : 'auto',
        overscrollBehavior : 'contain',
        touchAction        : 'pan-y',
        display            : 'grid',
        alignContent       : 'start',
        gap                : '8px',
        padding            : '2px',
        boxSizing          : 'border-box',
    });

    const corner = document.createElement('div');

    Object.assign(corner.style, {
        position    : 'absolute',
        right       : '0',
        bottom      : '0',
        width       : `${FLOAT_CORNER_SIZE}px`,
        height      : `${FLOAT_CORNER_SIZE}px`,
        cursor      : 'nwse-resize',
        background  : 'linear-gradient(135deg, transparent 50%, #2a2a2a 50%)',
        touchAction : 'none',
        zIndex      : '2',
    });

    function close()
    {
        if (closed)
        {
            return;
        }

        closed = true;

        if (document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement))
        {
            document.activeElement.blur();
        }

        window.getSelection()?.removeAllRanges();

        texturePickerGesture.end();

        stopEditableKeys?.();
        stopEditableKeys = null;

        stopWheel?.();
        stopWheel = null;

        for (const cleanup of dragCleanups)
        {
            cleanup();
        }

        dragCleanups.length = 0;

        overlay.removeEventListener('pointerdown', onOverlayPointerDown);
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('resize', onWindowResize);

        listColumns?.dispose();
        listColumns = null;

        lazyThumbs?.dispose();
        lazyThumbs = null;

        filterField?.destroy();
        filterField = null;

        grid.replaceChildren();
        overlay.remove();
        options.onClose?.();
    }

    function selectName(name: string)
    {
        options.onSelect(name);
        close();
    }

    function setViewMode(mode: TexturePickerViewMode)
    {
        viewMode = mode;

        writeTexturePickerViewMode(mode);
        syncViewButtons();
        renderItems();
    }

    function syncViewButtons()
    {
        for (const [mode, button] of viewButtons.entries())
        {
            const active = mode === viewMode;

            button.style.background = active ? '#4772b3' : '#3a3a3a';
            button.style.color = active ? '#fff' : '#bdbdbd';
        }
    }

    function ensureLazyThumbs()
    {
        if (!lazyThumbs)
        {
            lazyThumbs = createTexturePickerLazyThumbs(grid);
        }

        return lazyThumbs;
    }

    function ensureListColumns()
    {
        const thumbs = ensureLazyThumbs();

        if (!listColumns)
        {
            listColumns = createTexturePickerColumns(grid, thumbs, selectName);

            listColumns.setCurrentName(options.currentName);
        }

        return listColumns;
    }

    function renderFlatItems(visible: Array<CachedTextureEntry>, flatMode: TexturePickerFlatViewMode)
    {
        usingListColumns = false;

        listColumns?.clear();
        lazyThumbs?.clear();
        grid.replaceChildren();

        applyTexturePickerGridLayout(grid, flatMode);

        const thumbs = ensureLazyThumbs();
        const fragment = document.createDocumentFragment();

        for (const entry of visible)
        {
            fragment.appendChild(createTexturePickerItem(
                entry,
                flatMode,
                options.currentName,
                selectName,
                thumbs,
            ));
        }

        grid.appendChild(fragment);
    }

    function renderColumnItems(visible: Array<CachedTextureEntry>)
    {
        usingListColumns = true;
        const columns = ensureListColumns();

        columns.setCurrentName(options.currentName);
        columns.setEntries(visible);
        columns.render();
    }

    function renderItems()
    {
        const normalizedFilter = filter.trim().toLowerCase();
        const visible = entries.filter((entry) => matchesFilter(entry.name, normalizedFilter));

        if (viewMode === 'list-miller')
        {
            renderColumnItems(visible);
        }
        else
        {
            renderFlatItems(visible, viewMode);
        }

        if (entries.length === 0)
        {
            status.textContent = 'Texture cache is empty';
        }
        else if (visible.length === 0)
        {
            status.textContent = `No matches · ${entries.length} cached`;
        }
        else
        {
            status.textContent = `${visible.length} of ${entries.length}`;
        }
    }

    const floatDragOptions = {
        getRect: () => floatRect,

        setRect: (rect: FloatRect) =>
        {
            floatRect = rect;
            applyRect();
        },

        clamp: clampPickerRect,

        onPersist: persistRect,
    };

    dragCleanups.push(attachFloatRectMove(header, {
        ...floatDragOptions,

        shouldStart: (event) =>
        {
            const target = event.target;

            if (!(target instanceof Node))
            {
                return true;
            }

            return !(closeBtn === target || closeBtn.contains(target));
        },
    }));

    dragCleanups.push(attachFloatRectResize(corner, floatDragOptions));

    const onOverlayPointerDown = (event: PointerEvent) =>
    {
        if (event.target !== overlay)
        {
            return;
        }

        event.preventDefault();
        close();
    };

    const onKeyDown = (event: KeyboardEvent) =>
    {
        if (event.key !== 'Escape')
        {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        close();
    };

    const onWindowResize = () =>
    {
        floatRect = clampPickerRect(floatRect);

        applyRect();
        persistRect();
    };

    dialog.style.position = 'fixed';

    dialog.append(header, toolbar, status, grid, corner);
    overlay.appendChild(dialog);

    texturePickerGesture.begin();
    overlay.addEventListener('pointerdown', onOverlayPointerDown);

    stopWheel = attachTexturePickerWheel(grid, () => usingListColumns);

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onWindowResize);
    document.body.appendChild(overlay);

    stopEditableKeys = isolateEditableKeyEvents(overlay);

    syncViewButtons();
    renderItems();
    filterField.input.focus();

    return { close };
}
