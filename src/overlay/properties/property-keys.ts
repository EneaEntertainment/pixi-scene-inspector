import type {
    ThreeDBooleanPropertyKey,
    ThreeDNumberPropertyKey,
    ThreeDPropertyKey,
    ThreeDStringPropertyKey,
} from './keys-3d';

type CorePropertyKey =
    | 'position.x'
    | 'position.y'
    | 'position.z'
    | 'width'
    | 'height'
    | 'depth'
    | 'rotation'
    | 'rotation.x'
    | 'rotation.y'
    | 'rotation.z'
    | 'angle'
    | 'angle.x'
    | 'angle.y'
    | 'angle.z'
    | 'scale.x'
    | 'scale.y'
    | 'scale.z'
    | 'anchor.x'
    | 'anchor.y'
    | 'pivot.x'
    | 'pivot.y'
    | 'origin.x'
    | 'origin.y'
    | 'origin.z'
    | 'skew.x'
    | 'skew.y'
    | 'alpha'
    | 'visible'
    | 'sortableChildren'
    | 'zIndex'
    | 'cullable'
    | 'blendMode'
    | 'eventMode'
    | 'cursor'
    | 'interactive'
    | 'buttonMode'
    | 'interactiveChildren'
    | 'label'
    | 'name'
    | 'texture'
    | 'tint'
    | 'animation.name'
    | 'animation.loop';

export type PropertyKey = CorePropertyKey | ThreeDPropertyKey;

export type BooleanPropertyKey =
    | 'visible'
    | 'sortableChildren'
    | 'cullable'
    | 'interactive'
    | 'buttonMode'
    | 'interactiveChildren'
    | 'animation.loop'
    | ThreeDBooleanPropertyKey;

export type StringPropertyKey =
    | 'eventMode'
    | 'cursor'
    | 'blendMode'
    | 'label'
    | 'name'
    | 'texture'
    | 'tint'
    | 'animation.name'
    | ThreeDStringPropertyKey;

export type NumberPropertyKey =
    | Exclude<CorePropertyKey, BooleanPropertyKey | StringPropertyKey>
    | ThreeDNumberPropertyKey;
