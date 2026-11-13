export type PixiPoint = {
    x: number;
    y: number;
    z?: number;
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
    z?: number;
    width?: number;
    height?: number;
    depth?: number;
    rotation?: number | PixiPoint;
    angle?: number | PixiPoint;
    quaternion?: { x?: number; y?: number; z?: number; w?: number };
    rotationDirty?: boolean;
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
    scaleZ?: number;
    anchor?: PixiPoint;
    anchorX?: number;
    anchorY?: number;
    pivot?: PixiPoint;
    origin?: PixiPoint;
    _origin?: PixiPoint | null;
    skew?: PixiPoint;
    billboardMode?: string;
    type?: string;
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
    toGlobal?: (position: { x: number; y: number; z?: number }, out?: unknown, skipUpdate?: boolean) => unknown;
    toLocal?: (
        position: { x: number; y: number; z?: number },
        from?: unknown,
        out?: unknown,
        skipUpdate?: boolean,
    ) => unknown;
    getGlobalPosition?: (out?: unknown, skipUpdate?: boolean) => unknown;
    worldTransform?: {
        a?: number;
        b?: number;
        c?: number;
        d?: number;
        tx?: number;
        ty?: number;
        elements?: ArrayLike<number>;
    };
    _view3d?: {
        root?: PixiNode;
        camera?: (PixiNode & {
            parent?: PixiNode | null;
            getGlobalPosition?: (out?: unknown, skipUpdate?: boolean) => unknown;
        }) | null;
        worldToScreen?: (
            position: { x: number; y: number; z: number },
            out?: { x?: number; y?: number },
            skipUpdate?: boolean,
        ) => { x: number; y: number } | null;
        screenToWorld?: (
            position: { x: number; y: number },
            distance: number,
            out?: unknown,
            skipUpdate?: boolean,
        ) => { x: number; y: number; z: number } | null;
        screenToRay?: (
            position: { x: number; y: number },
            out?: unknown,
            skipUpdate?: boolean,
        ) => {
            origin: { x: number; y: number; z: number };
            direction: { x: number; y: number; z: number };
        };
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
