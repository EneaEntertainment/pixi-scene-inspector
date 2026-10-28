import { moveNode, selectNode, takeSnapshot, toggleNodeVisible } from './page-ops';

import type { PixiTreeHost } from './host';

export function createInPageHost(): PixiTreeHost
{
    return {
        fetchSnapshot     : async () => takeSnapshot(),
        selectNode        : async (pathId) => selectNode(pathId),
        toggleNodeVisible : async (pathId) => toggleNodeVisible(pathId),
        moveNode          : async (sourceId, parentId, index) =>
            moveNode(sourceId, parentId, index),
    };
}
