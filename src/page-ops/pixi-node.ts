export type PixiPoint = {
    x: number;
    y: number;
};

export type PixiNode = {
    children?: Array<PixiNode> | { list?: Array<PixiNode> };
    list?: Array<PixiNode>;
    root?: PixiNode;
    visible?: boolean;
    alpha?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    angle?: number;
    zIndex?: number;
    sortableChildren?: boolean;
    cullable?: boolean;
    eventMode?: string;
    cursor?: string;
    interactive?: boolean;
    buttonMode?: boolean;
    interactiveChildren?: boolean;
    blendMode?: string | number;
    position?: PixiPoint;
    scale?: PixiPoint;
    anchor?: PixiPoint;
    pivot?: PixiPoint;
    skew?: PixiPoint;
    label?: unknown;
    name?: unknown;
    text?: string | number;
    style?: Record<string, unknown>;
    fontName?: string;
    fontSize?: number;
    align?: string;
    letterSpacing?: number;
    maxWidth?: number;
    tint?: unknown;
    _activePagesMeshData?: Array<{ mesh?: PixiNode } | null>;
    parent?: PixiNode | null;
    destroyed?: boolean;
    addChild?: (child: PixiNode) => unknown;
    addChildAt?: (child: PixiNode, index: number) => unknown;
    getLocalBounds?: () => unknown;
    getBounds?: (...args: Array<unknown>) => unknown;
    worldTransform?: {
        a: number;
        b: number;
        c: number;
        d: number;
        tx: number;
        ty: number;
    };
    _view3d?: {
        root?: PixiNode;
        camera?: (PixiNode & { parent?: PixiNode | null }) | null;
    };
};

export function isNodeAlive(node: PixiNode | null | undefined): node is PixiNode
{
    return !!node && (!('destroyed' in node) || !node.destroyed);
}

export type PageGlobals = typeof globalThis & {
    PIXI?: {
        VERSION?: string;
        [name: string]: unknown;
    };

    __PIXI_APP__?: {
        stage?: PixiNode;
        canvas?: HTMLCanvasElement;
        view?: HTMLCanvasElement;
        screen?: {
            width?: number;
            height?: number;
        };
        renderer?: {
            lastObjectRendered?: PixiNode;
            _lastObjectRendered?: PixiNode;
            canvas?: HTMLCanvasElement;
            view?: HTMLCanvasElement;
            width?: number;
            height?: number;
            resolution?: number;
        };
    };

    __PIXI_STAGE__?: PixiNode;

    __PIXI_RENDERER__?: {
        lastObjectRendered?: PixiNode;
        _lastObjectRendered?: PixiNode;
        canvas?: HTMLCanvasElement;
        view?: HTMLCanvasElement;
        width?: number;
        height?: number;
        resolution?: number;
    };

    $pixi?: PixiNode;
};

export function ctorName(node: PixiNode): string
{
    const ctor = (node as { constructor?: { name?: string } }).constructor;

    return ctor?.name ?? '';
}
