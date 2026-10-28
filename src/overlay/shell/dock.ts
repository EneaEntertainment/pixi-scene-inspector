import { isEditableKeyTarget, isolateEditableKeyEvents } from '../../editable-keys';
import {
    DEFAULT_TOGGLE_HOTKEY,
    HOTKEY_CONFIG_EVENT,
    matchesHotkey,
    normalizeHotkeyChord,
    readHotkeyAttr,
} from '../../hotkey';
import { createSelectionChannel } from '../../selection-channel';
import { mountPixiSceneInspector } from '../mount';
import { createPropertiesPanel, type PropertiesPanel } from '../properties/panel';
import { installSelectionHighlight } from '../selection-highlight';
import { readPanelSettings } from './settings';
import { createTreePanel } from './tree-panel';
import { installViewportPatches, readNumberGetter, triggerResize } from './viewport';

import type { HotkeyChord } from '../../hotkey';
import type { MountedPixiSceneInspector, MountPixiSceneInspectorOptions } from '../mount';

const SHELL_ID = 'pixi-scene-inspector-shell';
const TREE_ID = 'pixi-scene-inspector-tree';
const PROPS_ID = 'pixi-scene-inspector-properties';
const DEFAULT_TREE_HEIGHT = '40%';
const DEFAULT_PROPS_WIDTH = 300;
const TREE_MIN_PX = 60;
const TREE_MIN_GAME_PX = 60;
const TREE_FLOAT_MIN_W = 280;
const PROPS_MIN_PX = 80;
const PROPS_MIN_GAME_PX = 80;
const DOCK_GLOBAL_KEY = '__PIXI_SCENE_INSPECTOR_DOCK__';
const HOTKEY_GLOBAL_KEY = '__PIXI_SCENE_INSPECTOR_DOCK_HOTKEY__';

export type DockPixiSceneInspectorOptions = MountPixiSceneInspectorOptions & {
    height?: number | string;
    resizable?: boolean;
};

type DockGlobal = {
    current: MountedPixiSceneInspector | null;
};

function dockGlobal(): DockGlobal
{
    const root = globalThis as typeof globalThis & Record<string, DockGlobal | undefined>;
    let state = root[DOCK_GLOBAL_KEY];

    if (!state)
    {
        state = { current: null };
        root[DOCK_GLOBAL_KEY] = state;
    }

    return state;
}

function clampTreeHeightPx(height: number, viewportH: number): number
{
    const max = Math.max(TREE_MIN_PX, viewportH - TREE_MIN_GAME_PX);

    return Math.max(TREE_MIN_PX, Math.min(max, height));
}

function parseTreeHeightPx(height: number | string, viewportH: number): number
{
    if (typeof height === 'number')
    {
        return clampTreeHeightPx(height, viewportH);
    }

    const trimmed = height.trim();

    if (trimmed.endsWith('%'))
    {
        const pct = Number.parseFloat(trimmed);

        if (!Number.isFinite(pct))
        {
            return clampTreeHeightPx(viewportH * 0.4, viewportH);
        }

        return clampTreeHeightPx((viewportH * pct) / 100, viewportH);
    }

    const px = Number.parseFloat(trimmed);

    if (!Number.isFinite(px))
    {
        return clampTreeHeightPx(viewportH * 0.4, viewportH);
    }

    return clampTreeHeightPx(px, viewportH);
}

function clampPropsWidthPx(width: number, viewportW: number): number
{
    const max = Math.max(PROPS_MIN_PX, viewportW - PROPS_MIN_GAME_PX);

    return Math.max(PROPS_MIN_PX, Math.min(max, width));
}

function clampTreeFloatWidthPx(width: number, viewportW: number): number
{
    const max = Math.max(TREE_FLOAT_MIN_W, viewportW);

    return Math.max(TREE_FLOAT_MIN_W, Math.min(max, width));
}

export function dockPixiSceneInspector(options?: DockPixiSceneInspectorOptions): MountedPixiSceneInspector
{
    if (
        document.getElementById(TREE_ID)
        || document.getElementById(SHELL_ID)
        || document.getElementById(PROPS_ID)
    )
    {
        throw new Error('pixi-scene-inspector overlay is already mounted');
    }

    const resizable = options?.resizable !== false;
    const readNativeWidth = readNumberGetter(window, 'innerWidth', () => window.innerWidth);

    const readNativeHeight = readNumberGetter(
        window,
        'innerHeight',
        () => window.innerHeight,
    );

    let nativeW = Math.max(1, Math.round(readNativeWidth()));
    let nativeH = Math.max(1, Math.round(readNativeHeight()));
    const treeSettings = readPanelSettings('tree');

    const defaultTreeH = parseTreeHeightPx(
        options?.height ?? DEFAULT_TREE_HEIGHT,
        nativeH,
    );

    const initialTreeH = clampTreeHeightPx(
        treeSettings.height ?? defaultTreeH,
        nativeH,
    );

    const defaultPropsW = clampPropsWidthPx(DEFAULT_PROPS_WIDTH, nativeW);
    const shell = document.createElement('div');

    shell.id = SHELL_ID;

    Object.assign(shell.style, {
        position  : 'fixed',
        top       : '0',
        left      : '0',
        right     : '0',
        bottom    : '0',
        overflow  : 'hidden',
        transform : 'translateZ(0)',
        zIndex    : '0',
    });

    const cleanups: Array<() => void> = [];
    let properties: PropertiesPanel | null = null;
    const selection = createSelectionChannel();
    const selectionHighlight = installSelectionHighlight();

    cleanups.push(() => selectionHighlight.destroy());

    const treePanel = createTreePanel({
        id            : TREE_ID,
        resizable,
        defaultHeight : initialTreeH,
        viewportW     : nativeW,
        viewportH     : nativeH,

        clampHeight : clampTreeHeightPx,
        clampWidth  : clampTreeFloatWidthPx,

        onShellBottomChange: (bottomPx, notify) =>
        {
            shell.style.bottom = `${bottomPx}px`;

            properties?.syncTreeHeight(bottomPx);

            if (notify)
            {
                triggerResize();
            }
        },
    });

    properties = createPropertiesPanel({
        id           : PROPS_ID,
        resizable,
        defaultWidth : defaultPropsW,
        treeH        : treePanel.shellBottomPx(),
        viewportW    : nativeW,
        viewportH    : nativeH,
        selection,

        clampWidth: clampPropsWidthPx,

        onShellRightChange: (rightPx, notify) =>
        {
            shell.style.right = `${rightPx}px`;

            if (notify)
            {
                triggerResize();
            }
        },
    });

    shell.style.right = `${properties.shellRightPx()}px`;
    shell.style.bottom = `${treePanel.shellBottomPx()}px`;

    const moved: Array<Node> = [];

    while (document.body.firstChild)
    {
        const child = document.body.firstChild;

        moved.push(child);
        shell.appendChild(child);
    }

    document.body.appendChild(shell);
    document.body.appendChild(treePanel.element);
    document.body.appendChild(properties.element);
    cleanups.push(isolateEditableKeyEvents(treePanel.element));
    cleanups.push(isolateEditableKeyEvents(properties.element));

    const viewportPatches = installViewportPatches(() => ({
        width  : Math.max(1, Math.round(shell.getBoundingClientRect().width || nativeW - (properties?.shellRightPx() ?? 0))),
        height : Math.max(1, Math.round(shell.getBoundingClientRect().height || nativeH - treePanel.shellBottomPx())),
    }));

    const onWindowResize = () =>
    {
        const native = viewportPatches.readNativeSize();

        nativeW = native.width;
        nativeH = native.height;

        treePanel.onViewportResize(nativeW, nativeH);
        properties?.onViewportResize(nativeW, nativeH, treePanel.shellBottomPx());
    };

    window.addEventListener('resize', onWindowResize, true);

    cleanups.push(() =>
        window.removeEventListener('resize', onWindowResize, true),
    );

    triggerResize();

    const panel = mountPixiSceneInspector(treePanel.panelHost, {
        ...options,
        selection,

        setHighlightEnabled: selectionHighlight.setEnabled,

        onBarReady: (bar) =>
        {
            treePanel.attachBarChrome(bar);
        },
    });

    const state = dockGlobal();

    const api: MountedPixiSceneInspector = {
        refresh : () => panel.refresh(),
        unmount : () =>
        {
            panel.unmount();

            for (const cleanup of cleanups)
            {
                cleanup();
            }

            properties?.destroy();
            treePanel.destroy();
            viewportPatches.restore();

            for (const node of moved)
            {
                document.body.appendChild(node);
            }

            shell.remove();

            if (state.current === api)
            {
                state.current = null;
            }

            triggerResize();
        },
    };

    state.current = api;

    return api;
}

let toggleLock = false;

export function togglePixiSceneInspector(
    options?: DockPixiSceneInspectorOptions,
): MountedPixiSceneInspector | null
{
    if (toggleLock)
    {
        return dockGlobal().current;
    }

    toggleLock = true;

    try
    {
        const state = dockGlobal();

        if (state.current)
        {
            state.current.unmount();

            return null;
        }

        return dockPixiSceneInspector(options);
    }
    finally
    {
        queueMicrotask(() =>
        {
            toggleLock = false;
        });
    }
}

export function installPixiSceneInspectorHotkey(options?: DockPixiSceneInspectorOptions): boolean
{
    const root = globalThis as typeof globalThis & Record<string, boolean | undefined>;

    if (root[HOTKEY_GLOBAL_KEY])
    {
        return false;
    }

    root[HOTKEY_GLOBAL_KEY] = true;

    let chord: HotkeyChord = readHotkeyAttr() ?? DEFAULT_TOGGLE_HOTKEY;

    window.addEventListener(HOTKEY_CONFIG_EVENT, (event) =>
    {
        if (!(event instanceof CustomEvent))
        {
            return;
        }

        const next = normalizeHotkeyChord(event.detail);

        if (next)
        {
            chord = next;
        }
    });

    window.addEventListener('keydown', (event) =>
    {
        if (!matchesHotkey(event, chord))
        {
            return;
        }

        if (isEditableKeyTarget(event.target))
        {
            return;
        }

        event.preventDefault();
        togglePixiSceneInspector(options);
    });

    return true;
}
