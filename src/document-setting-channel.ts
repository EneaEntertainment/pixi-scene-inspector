type DocumentSettingChannelOptions<T> = {
    attr: string;
    event: string;
    serialize: (value: T) => string;
    parse: (raw: string) => T | undefined;
    normalize: (raw: unknown) => T;
    apply?: (value: T) => void;
};

type DocumentSettingChannel<T> = {
    readAttr: (element?: Element) => T | undefined;
    publish: (value: T) => T;
    subscribe: (listener: (value: T) => void) => () => void;
};

export function parseJsonDocumentSetting<T>(raw: string, normalize: (value: unknown) => T): T | undefined
{
    try
    {
        return normalize(JSON.parse(raw) as unknown);
    }
    catch
    {
        return undefined;
    }
}

export function createDocumentSettingChannel<T>(options: DocumentSettingChannelOptions<T>): DocumentSettingChannel<T>
{
    const { attr, event, serialize, parse, normalize, apply } = options;

    function readAttr(element: Element = document.documentElement): T | undefined
    {
        const raw = element.getAttribute(attr);

        if (raw === null)
        {
            return undefined;
        }

        return parse(raw);
    }

    function publish(value: T): T
    {
        const next = normalize(value);

        apply?.(next);
        document.documentElement.setAttribute(attr, serialize(next));
        window.dispatchEvent(new CustomEvent(event, { detail: next }));

        return next;
    }

    function subscribe(listener: (value: T) => void): () => void
    {
        const onEvent = (eventValue: Event) =>
        {
            if (!(eventValue instanceof CustomEvent))
            {
                return;
            }

            const next = normalize(eventValue.detail);

            apply?.(next);
            listener(next);
        };

        const observer = new MutationObserver(() =>
        {
            const next = readAttr();

            if (next === undefined)
            {
                return;
            }

            apply?.(next);
            listener(next);
        });

        window.addEventListener(event, onEvent);

        observer.observe(document.documentElement, {
            attributes      : true,
            attributeFilter : [attr],
        });

        const initial = readAttr();

        if (initial !== undefined)
        {
            apply?.(initial);
            listener(initial);
        }

        return () =>
        {
            window.removeEventListener(event, onEvent);
            observer.disconnect();
        };
    }

    return {
        readAttr,
        publish,
        subscribe,
    };
}
