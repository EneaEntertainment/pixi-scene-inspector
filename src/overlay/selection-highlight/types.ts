import type { PixiNode } from '../../page-ops/pixi-node';
import type { NumberPropertyKey } from '../properties/node';

export type MatrixLike = {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
};

export type LocalBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

export type BoxPaint = {
    width: number;
    height: number;
    matrix: MatrixLike;
    rootLeft: number;
    rootTop: number;
    canvasScaleX: number;
    canvasScaleY: number;
};

export type DragMode = 'move' | 'rotate' | 'scaleX' | 'scaleY' | 'scaleUniform';

export type NodeSnapshot = {
    node: PixiNode;
    values: Map<NumberPropertyKey, number>;
};

export type SelectionHighlight = {
    setEnabled: (enabled: boolean) => void;
    destroy: () => void;
};

export type OverlayRoot = {
    root: HTMLDivElement;
    box: HTMLDivElement;
    outline: SVGRectElement;
    anchorMark: HTMLDivElement;
    rotateStalk: HTMLDivElement;
    rotateHandle: HTMLDivElement;
    scaleXHandle: HTMLDivElement;
    scaleYHandle: HTMLDivElement;
    uniformHandle: HTMLDivElement;
};
