import { isEditableKeyTarget } from '../editable-keys';

type PanelKeyContext = {
    showHelp: boolean;
    selectedId: string | null;
    clipboardId: string | null;
};

type PanelKeyAction =
  | { type: 'closeHelp' }
  | { type: 'copy'; id: string }
  | { type: 'paste'; sourceId: string; parentId: string }
  | { type: 'isolate' }
  | { type: 'toggleVisible' }
  | { type: 'expand' }
  | { type: 'collapse' }
  | {
      type: 'navigate';
      key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
      toEnd: boolean;
  };

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

    if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C'))
    {
        if (!ctx.selectedId)
        {
            return null;
        }

        return { type: 'copy', id: ctx.selectedId };
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === 'v' || e.key === 'V'))
    {
        if (!ctx.clipboardId || !ctx.selectedId)
        {
            return null;
        }

        return {
            type     : 'paste',
            sourceId : ctx.clipboardId,
            parentId : ctx.selectedId,
        };
    }

    if (e.metaKey || e.ctrlKey)
    {
        return null;
    }

    if ((e.key === 'i' || e.key === 'I') && ctx.selectedId)
    {
        return { type: 'isolate' };
    }

    if ((e.key === 'h' || e.key === 'H') && ctx.selectedId)
    {
        return { type: 'toggleVisible' };
    }

    if ((e.key === '+' || e.key === '=') && ctx.selectedId)
    {
        return { type: 'expand' };
    }

    if ((e.key === '-' || e.key === '_') && ctx.selectedId)
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
