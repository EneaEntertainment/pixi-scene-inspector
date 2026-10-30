export type TreeNodeData = {
    id: string;
    uid: number;
    label: string;
    typeName: string;
    visible: boolean;
    children: Array<TreeNodeData>;
};

export type SnapshotResult =
  | { ok: true; tree: TreeNodeData; source: string }
  | { ok: false; reason: string };

export type PixiTreeHost = {
    fetchSnapshot(): Promise<SnapshotResult>;
    selectNode(pathId: string): Promise<boolean>;
    selectNodes(pathIds: Array<string>): Promise<boolean>;
    toggleNodeVisible(pathId: string): Promise<boolean>;
    moveNode(
        sourceId: string,
        parentId: string,
        index: number | null,
    ): Promise<string | null>;
    moveNodes(
        sourceIds: Array<string>,
        parentId: string,
        index: number | null,
    ): Promise<Array<string> | null>;
};

export type SelectionInfo = {
    id: string | null;
    name: string | null;
    ids: Array<string>;
};

export type SelectionChannel = {
    publish: (info: SelectionInfo) => void;
    subscribe: (listener: (info: SelectionInfo) => void) => () => void;
};

export type MountedPixiSceneInspector = {
    unmount: () => void;
    refresh: () => Promise<void>;
};

export type MountPixiSceneInspectorOptions = {
    host?: PixiTreeHost;
    selection?: SelectionChannel;
};

export type DockPixiSceneInspectorOptions = MountPixiSceneInspectorOptions & {
    height?: number | string;
    resizable?: boolean;
};

export function mountPixiSceneInspector(
    target: HTMLElement,
    options?: MountPixiSceneInspectorOptions,
): MountedPixiSceneInspector;

export function dockPixiSceneInspector(options?: DockPixiSceneInspectorOptions): MountedPixiSceneInspector;

export function togglePixiSceneInspector(
    options?: DockPixiSceneInspectorOptions,
): MountedPixiSceneInspector | null;

export function installPixiSceneInspectorHotkey(options?: DockPixiSceneInspectorOptions): boolean;
