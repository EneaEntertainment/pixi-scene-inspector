export type TreeNodeData = {
    id: string;
    uid: number;
    label: string;
    typeName: string;
    visible: boolean;
    children: Array<TreeNodeData>;
    filterMatch?: boolean;
};

export type SnapshotResult =
  | { ok: true; tree: TreeNodeData; source: string }
  | { ok: false; reason: string };

export type LaidOutNode = {
    id: string;
    label: string;
    typeName: string;
    visible: boolean;
    filterMatch?: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    children: Array<LaidOutNode>;
};

export type TreeEdge = {
    points: Array<number>;
};
