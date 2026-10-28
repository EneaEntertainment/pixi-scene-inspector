import { mount, unmount } from 'svelte';
import { createInPageHost } from '../host-in-page';
import App from '../panel/app.svelte';
import { createSelectionChannel } from '../selection-channel';

import type { PixiTreeHost } from '../host';
import type { SelectionChannel } from '../selection-channel';

export type MountedPixiSceneInspector = {
    unmount: () => void;
    refresh: () => Promise<void>;
};

export type MountPixiSceneInspectorOptions = {
    host?: PixiTreeHost;
    onBarReady?: (bar: HTMLElement) => void;
    selection?: SelectionChannel;
};

export function mountPixiSceneInspector(
    target: HTMLElement,
    options?: MountPixiSceneInspectorOptions,
): MountedPixiSceneInspector
{
    const host = options?.host ?? createInPageHost();
    const selection = options?.selection ?? createSelectionChannel();

    const app = mount(App, {
        target,
        props: {
            host,
            onBarReady: options?.onBarReady,
            selection,
        },
    });

    return {
        unmount: () =>
        {
            void unmount(app);
        },

        refresh: () => app.refresh(),
    };
}
