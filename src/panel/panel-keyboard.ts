import { isEditableKeyTarget } from '../editable-keys';
import { isBlockingGestureActive } from '../gesture-active';

type PanelKeyContext = {
    showHelp: boolean;
    selectedIds: Array<string>;
    clipboardIds: Array<string>;
    isolated: boolean;
    canRestoreSelection: boolean;
};

type PanelKeyAction =
  | { type: 'closeHelp' }
  | { type: 'clearSelection' }
  | { type: 'restoreSelection' }
  | { type: 'copy'; ids: Array<string> }
  | { type: 'paste'; sourceIds: Array<string>; parentId: string }
  | { type: 'isolate' }
  | { type: 'toggleVisible' }
  | { type: 'expand' }
  | { type: 'collapse' }
  | { type: 'navigate'; key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'; toEnd: boolean; };

export function resolvePanelKey(e: KeyboardEvent, ctx: PanelKeyContext): PanelKeyAction | null
{
    if (e.defaultPrevented)
    {
        return null;
    }

    if (isEditableKeyTarget(e.target))
    {
        return null;
    }

    if (e.key === 'Escape' && ctx.showHelp)
    {
        return { type: 'closeHelp' };
    }

    if (ctx.showHelp)
    {
        return null;
    }

    if (e.key === 'Escape')
    {
        if (isBlockingGestureActive())
        {
            return null;
        }

        if (e.shiftKey)
        {
            if (ctx.selectedIds.length > 0 || !ctx.canRestoreSelection)
            {
                return null;
            }

            return { type: 'restoreSelection' };
        }

        if (ctx.selectedIds.length === 0)
        {
            return null;
        }

        return { type: 'clearSelection' };
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C'))
    {
        if (ctx.selectedIds.length === 0)
        {
            return null;
        }

        return { type: 'copy', ids: [...ctx.selectedIds] };
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === 'v' || e.key === 'V'))
    {
        if (ctx.clipboardIds.length === 0 || ctx.selectedIds.length === 0)
        {
            return null;
        }

        const parentId = ctx.selectedIds[ctx.selectedIds.length - 1];

        if (!parentId)
        {
            return null;
        }

        return {
            type      : 'paste',
            sourceIds : [...ctx.clipboardIds],
            parentId,
        };
    }

    if (e.metaKey || e.ctrlKey)
    {
        return null;
    }

    if (
        (e.key === 'i' || e.key === 'I')
        && (ctx.isolated || ctx.selectedIds.length === 1)
    )
    {
        return { type: 'isolate' };
    }

    if ((e.key === 'h' || e.key === 'H') && ctx.selectedIds.length > 0)
    {
        return { type: 'toggleVisible' };
    }

    if ((e.key === '+' || e.key === '=') && ctx.selectedIds.length > 0)
    {
        return { type: 'expand' };
    }

    if ((e.key === '-' || e.key === '_') && ctx.selectedIds.length > 0)
    {
        return { type: 'collapse' };
    }

    if (
        e.key !== 'ArrowLeft'
    && e.key !== 'ArrowRight'
    && e.key !== 'ArrowUp'
    && e.key !== 'ArrowDown'
    )
    {
        return null;
    }

    if (e.shiftKey)
    {
        return null;
    }

    return { type: 'navigate', key: e.key, toEnd: e.altKey };
}
