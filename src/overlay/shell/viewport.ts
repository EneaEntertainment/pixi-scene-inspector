type GetterPatch = {
    restore: () => void;
};

type ViewportPatches = {
    restore: () => void;
    readNativeSize: () => { width: number; height: number };
};

function patchNumberGetter(target: object, key: string, getValue: () => number): GetterPatch | null
{
    const existing = Object.getOwnPropertyDescriptor(target, key);

    if (existing && existing.configurable === false)
    {
        return null;
    }

    try
    {
        Object.defineProperty(target, key, {
            configurable : true,
            enumerable   : existing?.enumerable ?? true,
            get          : getValue,
        });
    }
    catch
    {
        return null;
    }

    return {
        restore: () =>
        {
            if (existing)
            {
                Object.defineProperty(target, key, existing);
            }
            else
            {
                Reflect.deleteProperty(target, key);
            }
        },
    };
}

export function readNumberGetter(target: object, key: string, fallback: () => number): () => number
{
    const desc = Object.getOwnPropertyDescriptor(target, key);
    const getter = desc?.get;

    if (getter)
    {
        return () => getter.call(target);
    }

    return fallback;
}

export function installViewportPatches(getSize: () => { width: number; height: number }): ViewportPatches
{
    const patches: Array<GetterPatch> = [];
    const size = () => getSize();

    const readNativeWidth = readNumberGetter(window, 'innerWidth', () => window.innerWidth);
    const readNativeHeight = readNumberGetter(
        window,
        'innerHeight',
        () => window.innerHeight,
    );

    const windowH = patchNumberGetter(window, 'innerHeight', () => size().height);
    const windowW = patchNumberGetter(window, 'innerWidth', () => size().width);

    if (windowH)
    {
        patches.push(windowH);
    }

    if (windowW)
    {
        patches.push(windowW);
    }

    const protoH = patchNumberGetter(Window.prototype, 'innerHeight', () => size().height);
    const protoW = patchNumberGetter(Window.prototype, 'innerWidth', () => size().width);

    if (protoH)
    {
        patches.push(protoH);
    }

    if (protoW)
    {
        patches.push(protoW);
    }

    const htmlHDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
    const htmlWDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
    const origClientH = htmlHDesc?.get;
    const origClientW = htmlWDesc?.get;

    if (htmlHDesc?.configurable !== false && origClientH)
    {
        const patch = patchNumberGetter(
            Element.prototype,
            'clientHeight',
            function patchedClientHeight(this: Element)
            {
                if (this === document.documentElement)
                {
                    return size().height;
                }

                return origClientH.call(this);
            },
        );

        if (patch)
        {
            patches.push(patch);
        }
    }

    if (htmlWDesc?.configurable !== false && origClientW)
    {
        const patch = patchNumberGetter(
            Element.prototype,
            'clientWidth',
            function patchedClientWidth(this: Element)
            {
                if (this === document.documentElement)
                {
                    return size().width;
                }

                return origClientW.call(this);
            },
        );

        if (patch)
        {
            patches.push(patch);
        }
    }

    const vv = window.visualViewport;

    if (vv)
    {
        const vvH = patchNumberGetter(vv, 'height', () => size().height);
        const vvW = patchNumberGetter(vv, 'width', () => size().width);

        if (vvH)
        {
            patches.push(vvH);
        }

        if (vvW)
        {
            patches.push(vvW);
        }
    }

    return {
        restore: () =>
        {
            for (const p of patches)
            {
                p.restore();
            }
        },

        readNativeSize: () => ({
            width  : Math.max(1, Math.round(readNativeWidth())),
            height : Math.max(1, Math.round(readNativeHeight())),
        }),
    };
}

export function triggerResize()
{
    window.dispatchEvent(new Event('resize'));
    window.visualViewport?.dispatchEvent(new Event('resize'));
}
