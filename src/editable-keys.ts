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

    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
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
