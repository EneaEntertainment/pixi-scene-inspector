import { findPixiCanvas } from '../page-ops/geometry';
import { pickPathIdAt } from '../page-ops/pick';
import { DEFAULT_PICK_INCLUDE_HIDDEN, readPickIncludeHiddenAttr, subscribePickIncludeHidden } from '../pick-settings';

import type { PageGlobals } from '../page-ops/pixi-node';

export type ClickToSelectOptions = {
    onPick: (pathId: string) => void;
    getCurrentPathId?: () => string | null | undefined;
    getRootPathId?: () => string | null | undefined;
};

const TREE_ID = 'pixi-scene-inspector-tree';
const PROPS_ID = 'pixi-scene-inspector-properties';

function isApplePlatform(): boolean
{
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform ?? navigator.platform ?? '';

    return (/mac|iphone|ipad|ipod/i).test(platform) || (/Mac OS X/).test(navigator.userAgent);
}

type CanvasPickModifierEvent = {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
};

export function isCanvasPickModifier(event: CanvasPickModifierEvent): boolean
{
    if (!event.altKey || event.shiftKey)
    {
        return false;
    }

    if (isApplePlatform())
    {
        return event.metaKey && !event.ctrlKey;
    }

    return event.ctrlKey && !event.metaKey;
}

function isInspectorChrome(target: EventTarget | null): boolean
{
    if (!(target instanceof Element))
    {
        return false;
    }

    return !!(
        target.closest(`#${TREE_ID}`)
        || target.closest(`#${PROPS_ID}`)
    );
}

function isOverCanvas(clientX: number, clientY: number, canvas: HTMLCanvasElement): boolean
{
    const rect = canvas.getBoundingClientRect();

    return (
        clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom
    );
}

export function installClickToSelect(options: ClickToSelectOptions): { destroy: () => void }
{
    const win = globalThis as PageGlobals;
    let includeHidden = readPickIncludeHiddenAttr() ?? DEFAULT_PICK_INCLUDE_HIDDEN;
    let moved = true;

    const onPointerMove = () =>
    {
        moved = true;
    };

    const blockGameInput = (event: Event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    };

    const onPointerDown = (event: PointerEvent) =>
    {
        if (!isCanvasPickModifier(event))
        {
            return;
        }

        if (event.button !== 0)
        {
            return;
        }

        if (isInspectorChrome(event.target))
        {
            return;
        }

        const canvas = findPixiCanvas(win);

        if (!canvas || !isOverCanvas(event.clientX, event.clientY, canvas))
        {
            return;
        }

        blockGameInput(event);

        const currentPathId = options.getCurrentPathId?.() ?? null;
        const rootPathId = options.getRootPathId?.() ?? null;

        const pathId = pickPathIdAt(
            event.clientX,
            event.clientY,
            currentPathId,
            moved,
            win,
            { includeHidden, rootPathId },
        );

        moved = false;

        if (!pathId)
        {
            return;
        }

        options.onPick(pathId);
    };

    const onContextMenu = (event: MouseEvent) =>
    {
        if (isInspectorChrome(event.target))
        {
            return;
        }

        if (!event.altKey || !(event.ctrlKey || event.metaKey))
        {
            return;
        }

        const canvas = findPixiCanvas(win);

        if (!canvas || !isOverCanvas(event.clientX, event.clientY, canvas))
        {
            return;
        }

        blockGameInput(event);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('contextmenu', onContextMenu, true);

    const unsubscribeIncludeHidden = subscribePickIncludeHidden((value) =>
    {
        includeHidden = value;
    });

    return {
        destroy: () =>
        {
            unsubscribeIncludeHidden();
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('pointermove', onPointerMove, true);
            window.removeEventListener('contextmenu', onContextMenu, true);
        },
    };
}
