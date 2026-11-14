import type { LocalBounds, MatrixLike } from '../../page-ops/geometry';
import type { PixiNode } from '../../page-ops/pixi-node';
import type { NumberPropertyKey } from '../properties/node';

export type { LocalBounds, MatrixLike };

export type BoxPaint = {
    width: number;
    height: number;
    matrix: MatrixLike;
    rootLeft: number;
    rootTop: number;
    viewRight: number;
    viewBottom: number;
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
    guideLines: Array<SVGLineElement>;
    guidesSvg: SVGSVGElement;
    pivotMark: HTMLDivElement;
    anchorMark: HTMLDivElement;
    rotateStalk: HTMLDivElement;
    rotateHandle: HTMLDivElement;
    scaleXHandle: HTMLDivElement;
    scaleYHandle: HTMLDivElement;
    uniformHandle: HTMLDivElement;
};
