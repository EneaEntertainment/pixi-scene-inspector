import { createChromePanel } from './chrome-panel';
import { dockBottomIconSvg, floatIconSvg } from './panel-icons';
import { floatRectFromPanelSettings, readPanelSettings } from './settings';

const DEFAULT_FLOAT_WIDTH = 720;
const FLOAT_MIN_W = 200;
const FLOAT_MIN_H = 120;
const Z_INDEX = '2147483645';

type TreePanel = {
    element: HTMLElement;
    panelHost: HTMLElement;
    isDocked: () => boolean;
    shellBottomPx: () => number;
    attachBarChrome: (bar: HTMLElement) => void;
    onViewportResize: (viewportW: number, viewportH: number) => void;
    destroy: () => void;
};

type CreateTreePanelOptions = {
    id: string;
    resizable: boolean;
    defaultHeight: number;
    viewportW: number;
    viewportH: number;
    clampHeight: (height: number, viewportH: number) => number;
    clampWidth: (width: number, viewportW: number) => number;
    onShellBottomChange: (bottomPx: number, notify: boolean) => void;
};

export function createTreePanel(options: CreateTreePanelOptions): TreePanel
{
    const stored = readPanelSettings('tree');

    const dockedH = options.clampHeight(
        stored.height ?? options.defaultHeight,
        options.viewportH,
    );

    const storedFloat = floatRectFromPanelSettings(stored);

    const initialFloatRect = storedFloat
        ?? {
            left  : 16,
            top   : Math.max(16, options.viewportH - dockedH - 16),
            width : Math.min(
                DEFAULT_FLOAT_WIDTH,
                Math.max(FLOAT_MIN_W, options.viewportW - 32),
            ),
            height: dockedH,
        };

    const chrome = createChromePanel({
        id              : options.id,
        settingsKey     : 'tree',
        dockEdge        : 'bottom',
        resizable       : options.resizable,
        zIndex          : Z_INDEX,
        viewportW       : options.viewportW,
        viewportH       : options.viewportH,
        clampWidth      : options.clampWidth,
        clampDockedSize : (size, _viewportW, viewportH) =>
            options.clampHeight(size, viewportH),
        floatMinWidth        : FLOAT_MIN_W,
        floatMinHeight       : FLOAT_MIN_H,
        initialDockedSize    : dockedH,
        initialFloatRect,
        resolveFloatOnUndock : (element, dockedSize, viewportW) =>
        {
            const rect = element.getBoundingClientRect();

            return {
                left  : Math.max(16, Math.round(rect.left)),
                top   : Math.max(16, Math.round(rect.top)),
                width : Math.min(
                    DEFAULT_FLOAT_WIDTH,
                    Math.max(FLOAT_MIN_W, viewportW - 32),
                ),
                height: dockedSize,
            };
        },
        floatIcon          : floatIconSvg,
        dockIcon           : dockBottomIconSvg,
        floatAriaLabel     : 'Float scene tree',
        dockAriaLabel      : 'Dock scene tree to the bottom',
        onShellInsetChange : options.onShellBottomChange,
        applyDockedLayout  : (element, dockedSize) =>
        {
            Object.assign(element.style, {
                top    : 'auto',
                left   : '0',
                right  : '0',
                bottom : '0',
                width  : 'auto',
                height : `${dockedSize}px`,
            });
        },
    });

    const panelHost = document.createElement('div');

    Object.assign(panelHost.style, {
        flex      : '1',
        minHeight : '0',
        minWidth  : '0',
        overflow  : 'hidden',
        position  : 'relative',
    });

    let barEl: HTMLElement | null = null;

    if (chrome.edgeHandle && chrome.cornerHandle)
    {
        chrome.element.appendChild(chrome.edgeHandle);
        chrome.element.appendChild(panelHost);
        chrome.element.appendChild(chrome.cornerHandle);
    }
    else
    {
        chrome.element.appendChild(panelHost);
    }

    function attachBarChrome(bar: HTMLElement)
    {
        if (barEl === bar)
        {
            return;
        }

        barEl = bar;

        chrome.setDragHandle(bar);
        bar.appendChild(chrome.modeBtn);
        chrome.attachFloatDrag(bar);

        chrome.addCleanup(() =>
        {
            chrome.modeBtn.remove();

            if (barEl === bar)
            {
                barEl = null;
            }
        });

        chrome.applyChrome();
    }

    chrome.applyChrome();
    options.onShellBottomChange(chrome.shellInsetPx(), false);

    return {
        element          : chrome.element,
        panelHost,
        isDocked         : chrome.isDocked,
        shellBottomPx    : chrome.shellInsetPx,
        attachBarChrome,
        onViewportResize : chrome.onViewportResize,
        destroy          : chrome.destroy,
    };
}
