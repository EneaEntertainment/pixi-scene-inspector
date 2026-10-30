import type { SnapshotResult } from './types';

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
