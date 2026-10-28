import { clampFloatRect, FLOAT_CORNER_SIZE } from './float-rect';
import { attachPointerDrag } from './pointer-drag';
import {
    floatRectFromPanelSettings,
    readPanelSettings,
    writeFloatPanelSettings,
    writePanelSettings,
} from './settings';

import type { FloatRect } from './float-rect';
import type { PanelMode } from './settings';

const HANDLE_EDGE_PX = 6;

export type ChromePanelSettingsKey = 'tree' | 'properties';
export type ChromeDockEdge = 'bottom' | 'right';

export const MODE_BTN_STYLE: Partial<CSSStyleDeclaration> = {
    flexShrink     : '0',
    display        : 'flex',
    alignItems     : 'center',
    justifyContent : 'center',
    width          : '22px',
    height         : '22px',
    padding        : '0',
    color          : '#bdbdbd',
    cursor         : 'pointer',
    background     : 'transparent',
    border         : '1.5px solid #bdbdbd',
    borderRadius   : '3px',
};

export type CreateChromePanelOptions = {
    id: string;
    settingsKey: ChromePanelSettingsKey;
    dockEdge: ChromeDockEdge;
    resizable: boolean;
    zIndex: string;
    viewportW: number;
    viewportH: number;
    clampWidth: (width: number, viewportW: number) => number;
    clampDockedSize: (size: number, viewportW: number, viewportH: number) => number;
    floatMinWidth?: number;
    floatMinHeight: number;
    initialDockedSize: number;
    initialFloatRect: FloatRect;
    resolveFloatOnUndock: (
        element: HTMLElement,
        dockedSize: number,
        viewportW: number,
        viewportH: number,
    ) => FloatRect;
    floatIcon: () => string;
    dockIcon: () => string;
    floatAriaLabel: string;
    dockAriaLabel: string;
    onShellInsetChange: (insetPx: number, notify: boolean) => void;
    applyDockedLayout: (element: HTMLElement, dockedSize: number) => void;
    shellStyle?: Partial<CSSStyleDeclaration>;
};

export type ChromePanel = {
    element: HTMLElement;
    modeBtn: HTMLButtonElement;
    edgeHandle: HTMLElement | null;
    cornerHandle: HTMLElement | null;
    isDocked: () => boolean;
    shellInsetPx: () => number;
    getDockedSize: () => number;
    setDockedSize: (next: number, notify: boolean) => void;
    getFloatRect: () => FloatRect;
    setFloatRect: (rect: FloatRect) => void;
    applyChrome: () => void;
    setDragHandle: (handle: HTMLElement | null) => void;
    attachFloatDrag: (handle: HTMLElement) => void;
    syncViewportW: (viewportW: number) => void;
    onViewportResize: (viewportW: number, viewportH: number) => void;
    addCleanup: (fn: () => void) => void;
    destroy: () => void;
};

export function createChromePanel(options: CreateChromePanelOptions): ChromePanel
{
    let dockedSize = options.initialDockedSize;
    let mode: PanelMode = readPanelSettings(options.settingsKey).mode ?? 'docked';
    let viewportW = options.viewportW;
    let viewportH = options.viewportH;
    const storedFloat = floatRectFromPanelSettings(readPanelSettings(options.settingsKey));
    let floatPlaced = storedFloat !== null;
    let dragHandle: HTMLElement | null = null;
    let syncResizeHandles: (() => void) | null = null;

    const cleanups: Array<() => void> = [];
    const element = document.createElement('div');

    element.id = options.id;

    Object.assign(element.style, {
        position      : 'fixed',
        zIndex        : options.zIndex,
        display       : 'flex',
        flexDirection : 'column',
        overflow      : 'hidden',
        background    : '#4a4a4a',
        boxSizing     : 'border-box',
        ...options.shellStyle,
    });

    const modeBtn = document.createElement('button');

    modeBtn.type = 'button';

    Object.assign(modeBtn.style, MODE_BTN_STYLE);

    function clampChromeFloat(rect: FloatRect): FloatRect
    {
        return clampFloatRect(rect, {
            clampWidth : options.clampWidth,
            viewportW,
            viewportH,
            minWidth   : options.floatMinWidth,
            minHeight  : options.floatMinHeight,
        });
    }

    let floatRect: FloatRect = clampChromeFloat(options.initialFloatRect);

    function shellInsetPx(): number
    {
        return mode === 'docked' ? dockedSize : 0;
    }

    function updateModeButton()
    {
        if (mode === 'docked')
        {
            modeBtn.setAttribute('aria-label', options.floatAriaLabel);

            modeBtn.innerHTML = options.floatIcon();
            modeBtn.title = 'Float';
        }
        else
        {
            modeBtn.setAttribute('aria-label', options.dockAriaLabel);

            modeBtn.innerHTML = options.dockIcon();
            modeBtn.title = 'Dock';
        }
    }

    function applyChrome()
    {
        if (mode === 'docked')
        {
            options.applyDockedLayout(element, dockedSize);

            Object.assign(element.style, {
                zIndex    : options.zIndex,
                border    : 'none',
                boxShadow : 'none',
            });

            if (dragHandle)
            {
                dragHandle.style.cursor = 'default';
            }
        }
        else
        {
            floatRect = clampChromeFloat(floatRect);

            Object.assign(element.style, {
                top       : `${floatRect.top}px`,
                left      : `${floatRect.left}px`,
                right     : 'auto',
                bottom    : 'auto',
                width     : `${floatRect.width}px`,
                height    : `${floatRect.height}px`,
                zIndex    : options.zIndex,
                border    : '1.5px solid #111',
                boxShadow : '2px 2px 0 #111',
            });

            if (dragHandle)
            {
                dragHandle.style.cursor = 'move';
            }
        }

        updateModeButton();
        syncResizeHandles?.();
    }

    function writeModeSettings()
    {
        if (options.dockEdge === 'bottom')
        {
            writePanelSettings(options.settingsKey, {
                mode,
                height: mode === 'floating' ? floatRect.height : dockedSize,
                ...(mode === 'floating' || floatPlaced
                    ? {
                        position : { left: floatRect.left, top: floatRect.top },
                        width    : floatRect.width,
                    }
                    : {}),
            });
        }
        else
        {
            writePanelSettings(options.settingsKey, {
                mode,
                width: mode === 'floating' ? floatRect.width : dockedSize,
                ...(mode === 'floating' || floatPlaced
                    ? {
                        position : { left: floatRect.left, top: floatRect.top },
                        height   : floatRect.height,
                    }
                    : {}),
            });
        }
    }

    function setMode(next: PanelMode, notify: boolean)
    {
        if (mode === 'docked' && next === 'floating')
        {
            const savedFloat = floatRectFromPanelSettings(
                readPanelSettings(options.settingsKey),
            );

            if (savedFloat)
            {
                floatRect = clampChromeFloat(savedFloat);
                floatPlaced = true;
            }
            else if (!floatPlaced)
            {
                floatRect = clampChromeFloat(
                    options.resolveFloatOnUndock(
                        element,
                        dockedSize,
                        viewportW,
                        viewportH,
                    ),
                );

                floatPlaced = true;
            }
            else
            {
                floatRect = clampChromeFloat(floatRect);
            }
        }
        else if (mode === 'floating' && next === 'docked')
        {
            floatPlaced = true;

            const fromFloat = options.dockEdge === 'bottom'
                ? floatRect.height
                : floatRect.width;

            dockedSize = options.clampDockedSize(fromFloat, viewportW, viewportH);
        }

        mode = next;

        writeModeSettings();
        applyChrome();
        options.onShellInsetChange(shellInsetPx(), notify);
    }

    function setDockedSize(next: number, notify: boolean)
    {
        dockedSize = options.clampDockedSize(next, viewportW, viewportH);

        if (mode === 'docked')
        {
            if (options.dockEdge === 'bottom')
            {
                element.style.height = `${dockedSize}px`;
            }
            else
            {
                element.style.width = `${dockedSize}px`;
            }

            options.onShellInsetChange(shellInsetPx(), notify);
        }
    }

    function onViewportResize(nextViewportW: number, nextViewportH: number)
    {
        viewportW = nextViewportW;
        viewportH = nextViewportH;
        dockedSize = options.clampDockedSize(dockedSize, viewportW, viewportH);

        if (mode === 'floating')
        {
            floatRect = clampChromeFloat(floatRect);
        }

        applyChrome();
        options.onShellInsetChange(shellInsetPx(), false);
    }

    modeBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        setMode(mode === 'docked' ? 'floating' : 'docked', true);
        modeBtn.blur();
    });

    modeBtn.addEventListener('pointerdown', (event) =>
    {
        event.stopPropagation();
    });

    let edgeHandle: HTMLElement | null = null;
    let cornerHandle: HTMLElement | null = null;

    if (options.resizable)
    {
        edgeHandle = document.createElement('div');

        if (options.dockEdge === 'bottom')
        {
            Object.assign(edgeHandle.style, {
                flex        : `0 0 ${HANDLE_EDGE_PX}px`,
                height      : `${HANDLE_EDGE_PX}px`,
                cursor      : 'ns-resize',
                background  : '#2a2a2a',
                touchAction : 'none',
            });
        }
        else
        {
            Object.assign(edgeHandle.style, {
                flex        : `0 0 ${HANDLE_EDGE_PX}px`,
                width       : `${HANDLE_EDGE_PX}px`,
                cursor      : 'ew-resize',
                background  : '#2a2a2a',
                touchAction : 'none',
            });
        }

        cornerHandle = document.createElement('div');

        Object.assign(cornerHandle.style, {
            position : 'absolute',
            right    : '0',
            bottom   : '0',
            width    : `${FLOAT_CORNER_SIZE}px`,
            height   : `${FLOAT_CORNER_SIZE}px`,
            cursor   : 'nwse-resize',
            background:
                'linear-gradient(135deg, transparent 50%, #2a2a2a 50%)',
            touchAction : 'none',
            zIndex      : '2',
        });

        const edge = edgeHandle;
        const corner = cornerHandle;

        syncResizeHandles = () =>
        {
            const docked = mode === 'docked';

            edge.style.display = docked ? 'block' : 'none';
            corner.style.display = docked ? 'none' : 'block';
        };

        {
            let startCoord = 0;
            let startSize = 0;

            cleanups.push(attachPointerDrag(edge, {
                shouldStart: () => mode === 'docked',

                onStart: (event) =>
                {
                    startCoord = options.dockEdge === 'bottom'
                        ? event.clientY
                        : event.clientX;
                    startSize = dockedSize;
                },

                onMove: (event) =>
                {
                    const delta = options.dockEdge === 'bottom'
                        ? startCoord - event.clientY
                        : startCoord - event.clientX;

                    setDockedSize(startSize + delta, true);
                },

                onEnd: () =>
                {
                    if (options.dockEdge === 'bottom')
                    {
                        writePanelSettings(options.settingsKey, { height: dockedSize });
                    }
                    else
                    {
                        writePanelSettings(options.settingsKey, { width: dockedSize });
                    }
                },
            }));
        }

        {
            let startX = 0;
            let startY = 0;
            let startW = 0;
            let startH = 0;

            cleanups.push(attachPointerDrag(corner, {
                stopPropagation: true,

                shouldStart: () => mode === 'floating',

                onStart: (event) =>
                {
                    startX = event.clientX;
                    startY = event.clientY;
                    startW = floatRect.width;
                    startH = floatRect.height;
                },

                onMove: (event) =>
                {
                    floatRect = clampChromeFloat({
                        left   : floatRect.left,
                        top    : floatRect.top,
                        width  : startW + (event.clientX - startX),
                        height : startH + (event.clientY - startY),
                    });

                    element.style.width = `${floatRect.width}px`;
                    element.style.height = `${floatRect.height}px`;
                },

                onEnd: () =>
                {
                    floatPlaced = true;

                    writeFloatPanelSettings(options.settingsKey, floatRect);
                },
            }));
        }
    }

    function attachFloatDrag(handle: HTMLElement)
    {
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        cleanups.push(attachPointerDrag(handle, {
            shouldStart: (event) =>
            {
                if (mode !== 'floating')
                {
                    return false;
                }

                const target = event.target as Node | null;

                if (
                    target
                    && (modeBtn === target
                        || modeBtn.contains(target)
                        || (target instanceof Element
                            && target.closest('button, input, label, a')))
                )
                {
                    return false;
                }

                return true;
            },

            onStart: (event) =>
            {
                startX = event.clientX;
                startY = event.clientY;
                startLeft = floatRect.left;
                startTop = floatRect.top;
            },

            onMove: (event) =>
            {
                floatRect = clampChromeFloat({
                    left   : startLeft + (event.clientX - startX),
                    top    : startTop + (event.clientY - startY),
                    width  : floatRect.width,
                    height : floatRect.height,
                });

                element.style.left = `${floatRect.left}px`;
                element.style.top = `${floatRect.top}px`;
            },

            onEnd: () =>
            {
                floatPlaced = true;

                writeFloatPanelSettings(options.settingsKey, floatRect);
            },
        }));
    }

    return {
        element,
        modeBtn,
        edgeHandle,
        cornerHandle,

        isDocked      : () => mode === 'docked',
        shellInsetPx,
        getDockedSize : () => dockedSize,
        setDockedSize,
        getFloatRect  : () => floatRect,

        setFloatRect: (rect: FloatRect) =>
        {
            floatRect = clampChromeFloat(rect);
        },

        applyChrome,

        setDragHandle: (handle: HTMLElement | null) =>
        {
            dragHandle = handle;
        },

        attachFloatDrag,

        syncViewportW: (nextViewportW: number) =>
        {
            viewportW = nextViewportW;
        },

        onViewportResize,

        addCleanup: (fn: () => void) =>
        {
            cleanups.push(fn);
        },

        destroy: () =>
        {
            for (const cleanup of cleanups)
            {
                cleanup();
            }

            element.remove();
        },
    };
}
