type NodeTypeStyle = {
    name: string;
    short: string;
    color: string;
};

export const CUSTOM_LABEL_COLOR = '#111111';

const UNKNOWN_TYPE_STYLE: Omit<NodeTypeStyle, 'name'> = {
    short : 'UNKNOWN',
    color : '#555555',
};

const NODE_TYPE_STYLES: Array<NodeTypeStyle> = [
    { name: 'Spine', short: 'SPINE', color: '#0e7490' },

    { name: 'Container', short: 'CONTAINER', color: '#c41e1e' },
    { name: 'DisplayObject', short: 'DISP_OBJ', color: '#c41e1e' },
    { name: 'ParticleContainer', short: 'PARTICLE', color: '#c41e1e' },
    { name: 'RenderContainer', short: 'RENDER_CTR', color: '#c41e1e' },
    { name: 'DOMContainer', short: 'DOM_CONT', color: '#c41e1e' },
    { name: 'RenderLayer', short: 'R_LAYER', color: '#c41e1e' },

    { name: 'Sprite', short: 'SPRITE', color: '#1a7a1a' },
    { name: 'AnimatedSprite', short: 'ANIM_SPRITE', color: '#1a7a1a' },
    { name: 'TilingSprite', short: 'TILE_SPR', color: '#1a7a1a' },
    { name: 'NineSliceSprite', short: 'NINE_SLICE', color: '#1a7a1a' },
    { name: 'NineSlicePlane', short: 'NINE_PLANE', color: '#1a7a1a' },
    { name: 'GifSprite', short: 'GIF_SPRITE', color: '#1a7a1a' },

    { name: 'Text', short: 'TEXT', color: '#1a5bb8' },
    { name: 'BitmapText', short: 'BMP_TEXT', color: '#1a5bb8' },
    { name: 'HTMLText', short: 'HTML_TEXT', color: '#1a5bb8' },
    { name: 'SplitText', short: 'SPLIT_TXT', color: '#1a5bb8' },
    { name: 'SplitBitmapText', short: 'SPLIT_BMP', color: '#1a5bb8' },

    { name: 'Graphics', short: 'GRAPHICS', color: '#f07006' },

    { name: 'Mesh', short: 'MESH', color: '#970e83' },
    { name: 'SlotMesh', short: 'SLOT_MESH', color: '#970e83' },
    { name: 'DarkSlotMesh', short: 'DARK_MESH', color: '#970e83' },
    { name: 'DarkTintMesh', short: 'DARK_TINT', color: '#970e83' },
    { name: 'MeshSimple', short: 'MESH_SIMP', color: '#970e83' },
    { name: 'MeshPlane', short: 'MESH_PLANE', color: '#970e83' },
    { name: 'MeshRope', short: 'MESH_ROPE', color: '#970e83' },
    { name: 'PerspectiveMesh', short: 'PERS_MESH', color: '#970e83' },
    { name: 'SimpleMesh', short: 'SIMP_MESH', color: '#970e83' },
    { name: 'SimplePlane', short: 'SIMP_PLANE', color: '#970e83' },
    { name: 'SimpleRope', short: 'SIMP_ROPE', color: '#970e83' },

    { name: 'View3D', short: 'VIEW_3D', color: '#0f766e' },
    { name: 'Scene3D', short: 'SCENE_3D', color: '#0f766e' },
    { name: 'Container3D', short: 'CONT_3D', color: '#0f766e' },
    { name: 'Model3D', short: 'MODEL_3D', color: '#0f766e' },
    { name: 'Mesh3D', short: 'MESH_3D', color: '#0d9488' },
    { name: 'Sprite3D', short: 'SPR_3D', color: '#0d9488' },
    { name: 'BatchedMesh3D', short: 'BATCH_3D', color: '#0d9488' },
    { name: 'ParticleContainer3D', short: 'PART_3D', color: '#0d9488' },
    { name: 'Camera3D', short: 'CAM_3D', color: '#14b8a6' },
    { name: 'DirectionalLight', short: 'DIR_LIGHT', color: '#f59e0b' },
    { name: 'PointLight', short: 'PT_LIGHT', color: '#f59e0b' },
    { name: 'SpotLight', short: 'SPOT_LGT', color: '#f59e0b' },
    { name: 'AmbientLight', short: 'AMB_LIGHT', color: '#f59e0b' },
    { name: 'Light', short: 'LIGHT', color: '#f59e0b' },
];

export const KNOWN_NODE_TYPE_NAMES: Array<string> = NODE_TYPE_STYLES.map(
    (style) => style.name,
);

export const NODE_TYPE_INSTANCEOF_ORDER: Array<string> = [
    'AnimatedSprite',
    'TilingSprite',
    'NineSliceSprite',
    'NineSlicePlane',
    'GifSprite',
    'Text',
    'BitmapText',
    'HTMLText',
    'SplitText',
    'SplitBitmapText',
    'Graphics',
    'SlotMesh',
    'DarkSlotMesh',
    'DarkTintMesh',
    'MeshSimple',
    'MeshPlane',
    'MeshRope',
    'PerspectiveMesh',
    'SimpleMesh',
    'SimplePlane',
    'SimpleRope',
    'Mesh',
    'Spine',
    'Sprite3D',
    'ParticleContainer3D',
    'BatchedMesh3D',
    'Mesh3D',
    'Model3D',
    'Camera3D',
    'DirectionalLight',
    'PointLight',
    'SpotLight',
    'AmbientLight',
    'Light',
    'Container3D',
    'View3D',
    'ParticleContainer',
    'RenderContainer',
    'DOMContainer',
    'RenderLayer',
    'Sprite',
    'Container',
    'DisplayObject',
];

const HIDE_BLOCKED_TYPE_NAMES: Array<string> = [
    'Camera3D',
    'Scene3D',
];

const byName = new Map(
    NODE_TYPE_STYLES.map((style) => [style.name, style] as const),
);

const HIDE_BLOCKED = new Set(HIDE_BLOCKED_TYPE_NAMES);

export function constructorNameCandidates(name: string): Array<string>
{
    if (!name)
    {
        return [];
    }

    const candidates: Array<string> = [name];
    let stripped = name;

    while (stripped.charAt(0) === '_')
    {
        stripped = stripped.slice(1);
        candidates.push(stripped);
    }

    for (let i = 0, len = candidates.length; i < len; i++)
    {
        const withoutDigits = candidates[i].replace(/\d+$/, '');

        if (withoutDigits && withoutDigits !== candidates[i])
        {
            candidates.push(withoutDigits);
        }
    }

    return candidates;
}

export function matchKnownTypeName(
    name: string,
    known: ReadonlySet<string>,
): string
{
    const candidates = constructorNameCandidates(name);

    for (let i = 0; i < candidates.length; i++)
    {
        if (known.has(candidates[i]))
        {
            return candidates[i];
        }
    }

    return '';
}

export function resolveNodeTypeStyle(typeName: string): Omit<NodeTypeStyle, 'name'>
{
    const candidates = constructorNameCandidates(typeName);
    let known: NodeTypeStyle | undefined;

    for (let i = 0; i < candidates.length; i++)
    {
        known = byName.get(candidates[i]);

        if (known)
        {
            break;
        }
    }

    if (known)
    {
        return { short: known.short, color: known.color };
    }

    let fallbackShort: string;

    if (typeName.length === 0)
    {
        fallbackShort = UNKNOWN_TYPE_STYLE.short;
    }
    else if (typeName.length <= 10)
    {
        fallbackShort = typeName.toUpperCase();
    }
    else
    {
        fallbackShort = `${typeName.slice(0, 9).toUpperCase()}…`;
    }

    return { short: fallbackShort, color: UNKNOWN_TYPE_STYLE.color };
}

export function isHideBlockedTypeName(typeName: string): boolean
{
    return matchKnownTypeName(typeName, HIDE_BLOCKED).length > 0;
}
