export type { PixiTreeHost } from './host';
export type {
    InspectorSettings,
    InspectorSettingsInput,
} from './inspector-settings';
export {
    type MountedPixiSceneInspector,
    mountPixiSceneInspector,
    type MountPixiSceneInspectorOptions,
} from './overlay/mount';
export {
    dockPixiSceneInspector,
    type DockPixiSceneInspectorOptions,
    installPixiSceneInspectorHotkey,
    togglePixiSceneInspector,
} from './overlay/shell/dock';
export {
    configurePixiSceneInspectorSettings,
    type ConfigurePixiSceneInspectorSettingsOptions,
    getPixiSceneInspectorSettings,
} from './page-inspector-settings';
export type { SelectionChannel, SelectionInfo } from './selection-channel';
