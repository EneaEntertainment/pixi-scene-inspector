export type SelectionInfo = {
    id: string | null;
    name: string | null;
    ids: Array<string>;
};

export type SelectionChannel = {
    publish(info: SelectionInfo): void;
    subscribe(listener: (info: SelectionInfo) => void): () => void;
};

function sameIds(a: Array<string>, b: Array<string>): boolean
{
    if (a.length !== b.length)
    {
        return false;
    }

    for (let i = 0; i < a.length; i++)
    {
        if (a[i] !== b[i])
        {
            return false;
        }
    }

    return true;
}

export function createSelectionChannel(): SelectionChannel
{
    let current: SelectionInfo = { id: null, name: null, ids: [] };
    const listeners = new Set<(info: SelectionInfo) => void>();

    return {
        publish(info)
        {
            if (
                current.id === info.id
                && current.name === info.name
                && sameIds(current.ids, info.ids)
            )
            {
                return;
            }

            current = { id: info.id, name: info.name, ids: info.ids };

            for (const listener of listeners)
            {
                listener(current);
            }
        },

        subscribe(listener)
        {
            listeners.add(listener);
            listener(current);

            return () =>
            {
                listeners.delete(listener);
            };
        },
    };
}
