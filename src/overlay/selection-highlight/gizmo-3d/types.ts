export type GizmoMode = 'move' | 'rotate' | 'scale';

export type GizmoAxis = 'x' | 'y' | 'z';

export type CanvasMetrics = {
    rect: DOMRect;
    scaleX: number;
    scaleY: number;
};

export type Gizmo3DController = {
    sync: (metrics: CanvasMetrics | null) => void;
    cancel: () => void;
    destroy: () => void;
};
