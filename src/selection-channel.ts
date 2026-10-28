export type SelectionInfo = { id: string | null; name: string | null };

export type SelectionChannel = {
    publish(info: SelectionInfo): void;
    subscribe(listener: (info: SelectionInfo) => void): () => void;
};

export function createSelectionChannel(): SelectionChannel
{
    let current: SelectionInfo = { id: null, name: null };
    const listeners = new Set<(info: SelectionInfo) => void>();

    return {
        publish(info)
        {
            if (current.id === info.id && current.name === info.name)
            {
                return;
            }

            current = info;

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
