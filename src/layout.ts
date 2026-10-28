import type { LaidOutNode, TreeEdge, TreeNodeData } from './types';

const NODE_W = 90;
const NODE_H = 30;
const H_GAP = 8;
const V_GAP = 20;
const STUB_LEN = 10;

const MAX_LABEL_CHARS = 10;

export function truncateLabel(label: string): string
{
    if (label.length <= MAX_LABEL_CHARS)
    {
        return label;
    }

    return `${label.slice(0, MAX_LABEL_CHARS - 1)}…`;
}

export function layoutTree(
    root: TreeNodeData,
    expandedIds: ReadonlySet<string> = new Set(),
): {
        nodes: Array<LaidOutNode>;
        edges: Array<TreeEdge>;
        width: number;
        height: number;
    }
{
  type Soft = {
      data: TreeNodeData;
      width: number;
      height: number;
      subtreeW: number;
      children: Array<Soft>;
      collapsedWithKids: boolean;
  };

  function measure(data: TreeNodeData): Soft
  {
      const expanded = expandedIds.has(data.id);
      const kids = expanded ? data.children.map(measure) : [];
      const collapsedWithKids = !expanded && data.children.length > 0;

      const childrenW = kids.length === 0
          ? 0
          : kids.reduce((s, c) => s + c.subtreeW, 0) + (H_GAP * (kids.length - 1));

      return {
          data,
          width    : NODE_W,
          height   : NODE_H,
          subtreeW : Math.max(NODE_W, childrenW),
          children : kids,
          collapsedWithKids,
      };
  }

  const soft = measure(root);
  const flat: Array<LaidOutNode> = [];
  const edges: Array<TreeEdge> = [];
  let hasCollapsedStub = false;

  function place(node: Soft, left: number, depth: number): LaidOutNode
  {
      const y = 24 + (depth * (NODE_H + V_GAP));
      const x = left;

      const laid: LaidOutNode = {
          id          : node.data.id,
          label       : node.data.label,
          typeName    : node.data.typeName,
          visible     : node.data.visible,
          filterMatch : node.data.filterMatch,
          x,
          y,
          width       : node.width,
          height      : node.height,
          children    : [],
      };

      const parentCx = Math.round(x + (node.width / 2));
      const parentBottom = y + node.height;

      if (node.collapsedWithKids)
      {
          hasCollapsedStub = true;

          edges.push({
              points: [parentCx, parentBottom, parentCx, parentBottom + STUB_LEN],
          });
      }
      else if (node.children.length > 0)
      {
          let childLeft = left;
          const childYs: Array<number> = [];
          const childCenters: Array<number> = [];

          for (const child of node.children)
          {
              const childLaid = place(child, childLeft, depth + 1);

              laid.children.push(childLaid);
              childCenters.push(Math.round(childLaid.x + (childLaid.width / 2)));
              childYs.push(childLaid.y);

              childLeft += child.subtreeW + H_GAP;
          }

          const midY = parentBottom + (V_GAP / 2);
          const minCx = Math.min(parentCx, ...childCenters);
          const maxCx = Math.max(parentCx, ...childCenters);

          edges.push({
              points: [parentCx, parentBottom, parentCx, midY],
          });

          if (minCx !== maxCx)
          {
              edges.push({
                  points: [minCx, midY, maxCx, midY],
              });
          }

          for (let i = 0; i < childCenters.length; i++)
          {
              edges.push({
                  points: [childCenters[i], midY, childCenters[i], childYs[i]],
              });
          }
      }

      flat.push(laid);

      return laid;
  }

  place(soft, 24, 0);

  const width = Math.max(...flat.map((n) => n.x + n.width), soft.subtreeW + 24) + 48;
  const height = Math.max(...flat.map((n) => n.y + n.height)) + (hasCollapsedStub ? STUB_LEN : 0) + 48;

  return { nodes: flat, edges, width, height };
}
