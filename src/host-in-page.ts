import { moveNode, moveNodes, selectNode, selectNodes, takeSnapshot, toggleNodeVisible } from './page-ops';

import type { PixiTreeHost } from './host';

export function createInPageHost(): PixiTreeHost
{
    return {
        fetchSnapshot     : async () => takeSnapshot(),
        selectNode        : async (pathId) => selectNode(pathId),
        selectNodes       : async (pathIds) => selectNodes(pathIds),
        toggleNodeVisible : async (pathId) => toggleNodeVisible(pathId),
        moveNode          : async (sourceId, parentId, index) => moveNode(sourceId, parentId, index),
        moveNodes         : async (sourceIds, parentId, index) => moveNodes(sourceIds, parentId, index),
    };
}
