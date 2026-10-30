import { createChromePanel, MODE_BTN_STYLE } from '../shell/chrome-panel';
import { copyIconSvg, dockRightIconSvg, exportIconSvg, floatIconSvg } from '../shell/panel-icons';
import { floatRectFromPanelSettings, readPanelSettings } from '../shell/settings';
import { createPropertiesForm } from './form';

import type { SelectionChannel } from '../../selection-channel';

const DEFAULT_FLOAT_HEIGHT = 280;
const HEADER_H = 32;
const FLOAT_MIN_H = HEADER_H + 40;
const Z_INDEX = '2147483647';

export type PropertiesPanel = {
    element: HTMLElement;
    width: () => number;
    isDocked: () => boolean;
    shellRightPx: () => number;
    syncTreeHeight: (treeH: number) => void;
    setWidth: (next: number, viewportW: number, notify: boolean) => void;
    onViewportResize: (viewportW: number, viewportH: number, treeH: number,) => void;
    destroy: () => void;
};

type CreatePropertiesPanelOptions = {
    id: string;
    resizable: boolean;
    defaultWidth: number;
    treeH: number;
    viewportW: number;
    viewportH: number;
    selection: SelectionChannel;
    clampWidth: (width: number, viewportW: number) => number;
    onShellRightChange: (rightPx: number, notify: boolean) => void;
};

export function createPropertiesPanel(options: CreatePropertiesPanelOptions): PropertiesPanel
{
    const stored = readPanelSettings('properties');

    const dockedW = options.clampWidth(
        stored.width ?? options.defaultWidth,
        options.viewportW,
    );

    let treeH = options.treeH;
    const storedFloat = floatRectFromPanelSettings(stored);

    const initialFloatRect = storedFloat
        ?? {
            left   : Math.max(0, options.viewportW - dockedW - 16),
            top    : 16,
            width  : dockedW,
            height : Math.min(
                DEFAULT_FLOAT_HEIGHT,
                Math.max(FLOAT_MIN_H, options.viewportH - treeH - 32),
            ),
        };

    const chrome = createChromePanel({
        id                : options.id,
        settingsKey       : 'properties',
        dockEdge          : 'right',
        resizable         : options.resizable,
        zIndex            : Z_INDEX,
        viewportW         : options.viewportW,
        viewportH         : options.viewportH,
        floatMinHeight    : FLOAT_MIN_H,
        initialDockedSize : dockedW,
        floatAriaLabel    : 'Float properties',
        dockAriaLabel     : 'Dock properties to the right',
        initialFloatRect,

        shellStyle: {
            color      : '#eee',
            fontFamily : 'ui-sans-serif, system-ui, sans-serif',
        },

        clampWidth      : options.clampWidth,
        clampDockedSize : (size, viewportW) => options.clampWidth(size, viewportW),

        resolveFloatOnUndock: (element, dockedSize) =>
        {
            const rect = element.getBoundingClientRect();

            return {
                left   : rect.left,
                top    : rect.top,
                width  : dockedSize,
                height : Math.min(
                    DEFAULT_FLOAT_HEIGHT,
                    Math.max(FLOAT_MIN_H, Math.round(rect.height)),
                ),
            };
        },
        floatIcon          : floatIconSvg,
        dockIcon           : dockRightIconSvg,
        onShellInsetChange : options.onShellRightChange,

        applyDockedLayout: (element, dockedSize) =>
        {
            Object.assign(element.style, {
                top    : '0',
                right  : '0',
                left   : 'auto',
                bottom : `${treeH}px`,
                width  : `${dockedSize}px`,
                height : 'auto',
            });
        },
    });

    const header = document.createElement('div');

    Object.assign(header.style, {
        flexShrink   : '0',
        minHeight    : `${HEADER_H}px`,
        display      : 'flex',
        alignItems   : 'center',
        gap          : '8px',
        padding      : '4px 8px 4px 10px',
        borderBottom : '2px solid #2e2e2e',
        background   : '#3a3a3a',
        boxSizing    : 'border-box',
    });

    const title = document.createElement('div');

    Object.assign(title.style, {
        flexGrow      : '1',
        minWidth      : '0',
        overflowWrap  : 'anywhere',
        wordBreak     : 'break-word',
        whiteSpace    : 'normal',
        fontSize      : '12px',
        fontWeight    : '700',
        letterSpacing : '0.02em',
        lineHeight    : '1.3',
    });

    const copyBtn = document.createElement('button');

    copyBtn.setAttribute('aria-label', 'Copy node name');

    copyBtn.type = 'button';
    copyBtn.innerHTML = copyIconSvg();
    copyBtn.title = 'Copy name';

    Object.assign(copyBtn.style, MODE_BTN_STYLE);

    const exportBtn = document.createElement('button');

    exportBtn.setAttribute('aria-label', 'Export all properties');

    exportBtn.type = 'button';
    exportBtn.innerHTML = exportIconSvg();
    exportBtn.title = 'Export all';

    Object.assign(exportBtn.style, MODE_BTN_STYLE);

    header.appendChild(copyBtn);
    header.appendChild(title);
    header.appendChild(exportBtn);
    header.appendChild(chrome.modeBtn);

    const content = document.createElement('div');

    Object.assign(content.style, {
        flex          : '1',
        minHeight     : '0',
        minWidth      : '0',
        display       : 'flex',
        flexDirection : 'row',
        overflowX     : 'hidden',
        overflowY     : 'hidden',
        position      : 'relative',
    });

    const body = document.createElement('div');

    Object.assign(body.style, {
        flex          : '1',
        minWidth      : '0',
        minHeight     : '0',
        display       : 'flex',
        flexDirection : 'column',
        overflowX     : 'hidden',
        overflowY     : 'hidden',
        position      : 'relative',
    });

    const form = createPropertiesForm(options.selection);

    body.appendChild(form.element);

    chrome.addCleanup(() =>
    {
        form.destroy();
    });

    const onWheel = (event: WheelEvent) =>
    {
        event.stopPropagation();

        const scroller = form.scrollElement;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;

        if (maxScroll <= 0)
        {
            event.preventDefault();

            return;
        }

        let delta = event.deltaY;

        if (event.deltaMode === 1)
        {
            delta *= 16;
        }
        else if (event.deltaMode === 2)
        {
            delta *= scroller.clientHeight;
        }

        const prev = scroller.scrollTop;
        const next = Math.min(maxScroll, Math.max(0, prev + delta));

        if (next !== prev)
        {
            scroller.scrollTop = next;
        }

        event.preventDefault();
    };

    chrome.element.addEventListener('wheel', onWheel, { passive: false, capture: true });

    chrome.addCleanup(() =>
    {
        chrome.element.removeEventListener('wheel', onWheel, true);
    });

    let selectedName: string | null = null;
    let titleFlash: Animation | null = null;

    function setHeaderActionEnabled(button: HTMLButtonElement, enabled: boolean)
    {
        button.disabled = !enabled;
        button.style.opacity = enabled ? '1' : '0.4';
        button.style.cursor = enabled ? 'pointer' : 'default';
    }

    let selectedIds: Array<string> = [];

    function setTitleName(name: string | null, ids: Array<string> = [])
    {
        selectedName = name;
        selectedIds = ids;
        title.textContent = name ?? 'Select a node';
        title.title = title.textContent;

        const single = name !== null && ids.length <= 1;

        setHeaderActionEnabled(copyBtn, single);
        setHeaderActionEnabled(exportBtn, single);
    }

    function flashTitleName()
    {
        titleFlash?.cancel();

        titleFlash = title.animate(
            [
                { opacity: '1' },
                { opacity: '0.15' },
                { opacity: '1' },
                { opacity: '0.15' },
                { opacity: '1' },
            ],
            { duration: 350, easing: 'linear' },
        );
    }

    function panelWidth(): number
    {
        return chrome.isDocked() ? chrome.getDockedSize() : chrome.getFloatRect().width;
    }

    function syncTreeHeight(nextTreeH: number)
    {
        treeH = nextTreeH;

        if (chrome.isDocked())
        {
            chrome.element.style.bottom = `${treeH}px`;
        }
    }

    function setWidth(next: number, nextViewportW: number, notify: boolean)
    {
        chrome.syncViewportW(nextViewportW);

        if (chrome.isDocked())
        {
            chrome.setDockedSize(next, notify);

            return;
        }

        chrome.setFloatRect({ ...chrome.getFloatRect(), width: next });

        const floatRect = chrome.getFloatRect();

        chrome.element.style.width = `${floatRect.width}px`;
        chrome.element.style.left = `${floatRect.left}px`;
        chrome.element.style.top = `${floatRect.top}px`;

        options.onShellRightChange(chrome.shellInsetPx(), notify);
    }

    function onViewportResize(
        nextViewportW: number,
        nextViewportH: number,
        nextTreeH: number,
    )
    {
        treeH = nextTreeH;

        chrome.onViewportResize(nextViewportW, nextViewportH);
    }

    copyBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();

        if (selectedName === null || selectedIds.length > 1)
        {
            return;
        }

        void navigator.clipboard.writeText(selectedName);
        flashTitleName();
        copyBtn.blur();
    });

    copyBtn.addEventListener('pointerdown', (event) =>
    {
        event.stopPropagation();
    });

    exportBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();

        if (selectedName === null || selectedIds.length > 1)
        {
            return;
        }

        form.openNodeExport(selectedName);
        exportBtn.blur();
    });

    exportBtn.addEventListener('pointerdown', (event) =>
    {
        event.stopPropagation();
    });

    if (chrome.edgeHandle)
    {
        content.appendChild(chrome.edgeHandle);
    }

    if (chrome.cornerHandle)
    {
        chrome.element.appendChild(chrome.cornerHandle);
    }

    content.appendChild(body);
    chrome.element.appendChild(header);
    chrome.element.appendChild(content);

    chrome.setDragHandle(header);
    chrome.attachFloatDrag(header);

    setTitleName(null);
    chrome.applyChrome();
    options.onShellRightChange(chrome.shellInsetPx(), false);

    chrome.addCleanup(
        options.selection.subscribe((info) =>
        {
            setTitleName(info.name, info.ids);
        }),
    );

    return {
        element      : chrome.element,
        width        : () => panelWidth(),
        isDocked     : chrome.isDocked,
        shellRightPx : chrome.shellInsetPx,
        syncTreeHeight,
        setWidth,
        onViewportResize,
        destroy      : chrome.destroy,
    };
}
