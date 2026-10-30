const NON_TEXT_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
]);

export function isEditableKeyTarget(target: EventTarget | null): boolean
{
    if (!(target instanceof HTMLElement))
    {
        return false;
    }

    if (target.isContentEditable)
    {
        return true;
    }

    const tag = target.tagName;

    if (tag === 'TEXTAREA' || tag === 'SELECT')
    {
        return true;
    }

    if (tag !== 'INPUT' || !(target instanceof HTMLInputElement))
    {
        return false;
    }

    return !NON_TEXT_INPUT_TYPES.has(target.type);
}

export function isolateEditableKeyEvents(root: HTMLElement): () => void
{
    const onKey = (event: KeyboardEvent) =>
    {
        if (!isEditableKeyTarget(event.target))
        {
            return;
        }

        event.stopPropagation();
    };

    root.addEventListener('keydown', onKey);
    root.addEventListener('keypress', onKey);
    root.addEventListener('keyup', onKey);

    return () =>
    {
        root.removeEventListener('keydown', onKey);
        root.removeEventListener('keypress', onKey);
        root.removeEventListener('keyup', onKey);
    };
}
