export type PixiPoint = {
    x: number;
    y: number;
};

export type PixiTextureFrame = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type PixiTexture = {
    label?: string;
    isTexture?: boolean;
    width?: number;
    height?: number;
    frame?: PixiTextureFrame;
    rotate?: number;
    textureCacheIds?: Array<string>;
    baseTexture?: {
        label?: string;
        width?: number;
        height?: number;
        resolution?: number;
        textureCacheIds?: Array<string>;
        resource?: {
            url?: string;
            src?: string;
            source?: unknown;
        };
    };
    source?: {
        label?: string;
        _sourceOrigin?: string;
        resource?: unknown;
        width?: number;
        height?: number;
        resolution?: number;
        _resolution?: number;
    };
};

export type PixiNode = {
    children?: Array<PixiNode> | { list?: Array<PixiNode> };
    list?: Array<PixiNode>;
    particleChildren?: Array<PixiNode>;
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
    scaleX?: number;
    scaleY?: number;
    anchor?: PixiPoint;
    anchorX?: number;
    anchorY?: number;
    pivot?: PixiPoint;
    skew?: PixiPoint;
    label?: unknown;
    name?: unknown;
    texture?: PixiTexture;
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
    addChild?: (...children: Array<PixiNode>) => unknown;
    addChildAt?: (child: PixiNode, index: number) => unknown;
    removeChild?: (...children: Array<PixiNode>) => unknown;
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

export type PixiRendererHandle = {
    lastObjectRendered?: PixiNode;
    _lastObjectRendered?: PixiNode;
    canvas?: HTMLCanvasElement;
    view?: HTMLCanvasElement;
    width?: number;
    height?: number;
    resolution?: number;

    extract?: {
        canvas?: (target: unknown) => unknown;
    };
};

export type PageGlobals = typeof globalThis & {
    PIXI?: {
        VERSION?: string;
        Cache?: unknown;
        Assets?: {
            cache?: unknown;
        };
        [name: string]: unknown;
    };

    Cache?: unknown;

    Assets?: {
        cache?: unknown;
    };

    __PIXI_CACHE__?: unknown;

    __PIXI_APP__?: {
        stage?: PixiNode;
        canvas?: HTMLCanvasElement;
        view?: HTMLCanvasElement;
        screen?: {
            width?: number;
            height?: number;
        };
        renderer?: PixiRendererHandle;
    };

    __PIXI_STAGE__?: PixiNode;

    __PIXI_RENDERER__?: PixiRendererHandle;

    $pixi?: PixiNode;
};

export function ctorName(node: PixiNode): string
{
    const ctor = (node as { constructor?: { name?: string } }).constructor;

    return ctor?.name ?? '';
}
