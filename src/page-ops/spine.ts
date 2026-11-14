import type { PixiNode } from './pixi-node';

type SpineNamedRef = {
    name?: string;
};

type SpineTrackEntry = {
    loop: boolean;
    trackTime?: number;
    trackLast?: number;
    nextTrackLast?: number;
    animationStart?: number;
    animationEnd?: number;
    animation: SpineNamedRef | null;
    isComplete?: () => boolean;
};

type SpineAnimationListener = {
    complete?: (entry: SpineTrackEntry) => void;
};

type SpineSkeletonData = {
    animations?: Array<SpineNamedRef>;
    skins?: Array<SpineNamedRef>;
    findSkin?: (skinName: string) => SpineNamedRef | null;
};

type SpineSkeleton = {
    data?: SpineSkeletonData;
    skin?: SpineNamedRef | null;
    setSkin?: (skin: SpineNamedRef | null) => void;
    setSkinByName?: (skinName: string) => void;
    setupPoseSlots?: () => void;
};

type SpineAnimationState = {
    timeScale?: number;
    tracks?: Array<SpineTrackEntry | null>;
    setAnimation?: (trackIndex: number, animationName: string, loop: boolean) => SpineTrackEntry;
    getCurrent?: (trackIndex: number) => SpineTrackEntry | null;
    getTrack?: (trackIndex: number) => SpineTrackEntry | null;
    addListener?: (listener: SpineAnimationListener) => void;
    removeListener?: (listener: SpineAnimationListener) => void;
    apply?: (skeleton: SpineSkeleton) => void;
};

type SpineNode = PixiNode & {
    state?: SpineAnimationState;
    skeleton?: SpineSkeleton;
    spineData?: SpineSkeletonData;
    update?: (delta: number) => void;
};

type Playback = {
    state: SpineAnimationState;
    listener: SpineAnimationListener;
    entry: SpineTrackEntry | null;
    onComplete: (() => void) | null;
    heldTimeScale: number | null;
};

export type SpinePlaybackInfo = {
    animationName: string | undefined;
    playing: boolean;
    paused: boolean;
    loop: boolean;
};

export type SpineAnimationSelection = {
    name: string;
    loop: boolean;
};

const TRACK = 0;
const playbackByNode = new WeakMap<PixiNode, Playback>();
const selectionByNode = new WeakMap<PixiNode, SpineAnimationSelection>();

function asSpine(node: PixiNode): SpineNode
{
    return node as SpineNode;
}

export function isSpineLike(node: PixiNode): boolean
{
    return typeof asSpine(node).state?.setAnimation === 'function';
}

function namesFrom(items: Array<SpineNamedRef> | undefined): Array<string>
{
    if (!items)
    {
        return [];
    }

    const names: Array<string> = [];

    for (let i = 0; i < items.length; i++)
    {
        const name = items[i]?.name;

        if (typeof name === 'string' && name !== '')
        {
            names.push(name);
        }
    }

    return names;
}

function namedList(
    spine: SpineNode,
    pick: (data: SpineSkeletonData | undefined) => Array<SpineNamedRef> | undefined,
): Array<string>
{
    const fromSkeleton = namesFrom(pick(spine.skeleton?.data));

    if (fromSkeleton.length > 0)
    {
        return fromSkeleton;
    }

    return namesFrom(pick(spine.spineData));
}

function currentEntry(node: SpineNode): SpineTrackEntry | null
{
    const state = node.state;

    if (!state)
    {
        return null;
    }

    if (typeof state.getCurrent === 'function')
    {
        return state.getCurrent(TRACK) ?? null;
    }

    if (typeof state.getTrack === 'function')
    {
        return state.getTrack(TRACK) ?? null;
    }

    return state.tracks?.[TRACK] ?? null;
}

function restoreTimeScale(playback: Playback): void
{
    if (playback.heldTimeScale === null)
    {
        return;
    }

    const held = playback.heldTimeScale;

    playback.heldTimeScale = null;
    playback.state.timeScale = held === 0 ? 1 : held;
}

function ensurePlayback(node: SpineNode): Playback | null
{
    const state = node.state;

    if (
        !state
        || typeof state.addListener !== 'function'
        || typeof state.setAnimation !== 'function'
    )
    {
        return null;
    }

    const existing = playbackByNode.get(node);

    if (existing?.state === state)
    {
        return existing;
    }

    if (existing)
    {
        restoreTimeScale(existing);

        try
        {
            existing.state.removeListener?.(existing.listener);
        }
        catch
        {
            void 0;
        }

        playbackByNode.delete(node);
    }

    const playback: Playback = {
        state,
        entry         : null,
        onComplete    : null,
        heldTimeScale : null,
        listener      : {},
    };

    playback.listener.complete = (entry) =>
    {
        if (entry !== playback.entry || entry.loop)
        {
            return;
        }

        playback.entry = null;

        const done = playback.onComplete;

        playback.onComplete = null;

        done?.();
    };

    state.addListener(playback.listener);
    playbackByNode.set(node, playback);

    return playback;
}

export function spineAnimationNames(node: PixiNode): Array<string>
{
    return namedList(asSpine(node), (data) => data?.animations);
}

export function spineSetAnimationSelection(node: PixiNode, name: string, loop: boolean)
{
    if (name === '')
    {
        selectionByNode.delete(node);

        return;
    }

    selectionByNode.set(node, { name, loop });
}

export function spineAnimationSelection(node: PixiNode): SpineAnimationSelection | undefined
{
    const selection = selectionByNode.get(node);

    if (!selection)
    {
        return undefined;
    }

    const names = spineAnimationNames(node);

    if (!names.includes(selection.name))
    {
        return undefined;
    }

    return selection;
}

export function spineSkinNames(node: PixiNode): Array<string>
{
    return namedList(asSpine(node), (data) => data?.skins);
}

export function spineCurrentSkinName(node: PixiNode): string | undefined
{
    const name = asSpine(node).skeleton?.skin?.name;

    if (typeof name !== 'string' || name === '')
    {
        return undefined;
    }

    return name;
}

export function spineSetSkin(node: PixiNode, skinName: string): boolean
{
    if (skinName === '')
    {
        return false;
    }

    const spine = asSpine(node);
    const skeleton = spine.skeleton;

    if (!skeleton)
    {
        return false;
    }

    try
    {
        if (typeof skeleton.setSkinByName === 'function')
        {
            skeleton.setSkinByName(skinName);
        }
        else if (typeof skeleton.setSkin === 'function')
        {
            const skin = skeleton.data?.findSkin?.(skinName)
                ?? skeleton.data?.skins?.find((item) => item.name === skinName)
                ?? null;

            if (!skin)
            {
                return false;
            }

            skeleton.setSkin(skin);
        }
        else
        {
            return false;
        }

        skeleton.setupPoseSlots?.();
        spine.state?.apply?.(skeleton);
        spine.update?.(0);
    }
    catch
    {
        return false;
    }

    return true;
}

function entryAnimationName(entry: SpineTrackEntry | null): string | undefined
{
    const name = entry?.animation?.name;

    if (typeof name !== 'string' || name === '')
    {
        return undefined;
    }

    return name;
}

function entryIsComplete(entry: SpineTrackEntry): boolean
{
    if (typeof entry.isComplete === 'function')
    {
        try
        {
            return entry.isComplete();
        }
        catch
        {
            void 0;
        }
    }

    const trackTime = entry.trackTime;
    const animationEnd = entry.animationEnd;

    if (typeof trackTime !== 'number' || typeof animationEnd !== 'number')
    {
        return false;
    }

    return trackTime >= animationEnd;
}

export function spinePlaybackInfo(node: PixiNode): SpinePlaybackInfo
{
    const spine = asSpine(node);
    const entry = currentEntry(spine);
    const animationName = entryAnimationName(entry);

    if (!entry || !animationName)
    {
        return {
            animationName : undefined,
            playing       : false,
            paused        : false,
            loop          : false,
        };
    }

    const playback = playbackByNode.get(node);
    const timeScale = typeof spine.state?.timeScale === 'number' ? spine.state.timeScale : 1;
    const pausedByUs = !!playback && playback.heldTimeScale !== null && playback.entry === entry;
    const paused = pausedByUs || timeScale === 0;
    const loop = !!entry.loop;
    const finished = !loop && !paused && entryIsComplete(entry);

    return {
        animationName,
        playing : !paused && !finished,
        paused  : paused && !finished,
        loop,
    };
}

export function spineCanResume(node: PixiNode, animationName: string): boolean
{
    const spine = asSpine(node);
    const entry = currentEntry(spine);

    if (!entry || entryAnimationName(entry) !== animationName || entryIsComplete(entry))
    {
        return false;
    }

    const playback = playbackByNode.get(node);

    if (playback && playback.heldTimeScale !== null && playback.entry === entry)
    {
        return true;
    }

    return spine.state?.timeScale === 0;
}

export function spinePlay(node: PixiNode, animationName: string, loop: boolean, onComplete: () => void): boolean
{
    if (animationName === '')
    {
        return false;
    }

    const playback = ensurePlayback(asSpine(node));

    if (!playback?.state.setAnimation)
    {
        return false;
    }

    playback.entry = null;
    playback.onComplete = onComplete;

    restoreTimeScale(playback);

    if (playback.state.timeScale === 0)
    {
        playback.state.timeScale = 1;
    }

    try
    {
        playback.entry = playback.state.setAnimation(TRACK, animationName, loop);
    }
    catch
    {
        playback.entry = null;
        playback.onComplete = null;

        return false;
    }

    return playback.entry !== null;
}

export function spinePause(node: PixiNode): boolean
{
    const spine = asSpine(node);
    const playback = ensurePlayback(spine);

    if (!playback)
    {
        return false;
    }

    const entry = currentEntry(spine);

    if (!entryAnimationName(entry))
    {
        return false;
    }

    playback.entry = entry;

    if (playback.heldTimeScale === null)
    {
        playback.heldTimeScale = typeof playback.state.timeScale === 'number'
            ? playback.state.timeScale
            : 1;
    }

    try
    {
        playback.state.timeScale = 0;
    }
    catch
    {
        return false;
    }

    return true;
}

export function spineResume(node: PixiNode, loop: boolean): boolean
{
    const spine = asSpine(node);
    const playback = ensurePlayback(spine);

    if (!playback)
    {
        return false;
    }

    const entry = currentEntry(spine);

    if (!entry || !entryAnimationName(entry))
    {
        return false;
    }

    playback.entry = entry;

    const held = playback.heldTimeScale;

    try
    {
        applyEntryLoop(entry, loop);

        playback.state.timeScale = held === null || held === 0 ? 1 : held;
    }
    catch
    {
        return false;
    }

    playback.heldTimeScale = null;

    return true;
}

function entryDuration(entry: SpineTrackEntry): number
{
    const start = typeof entry.animationStart === 'number' ? entry.animationStart : 0;
    const end = typeof entry.animationEnd === 'number' ? entry.animationEnd : 0;

    return end - start;
}

function foldTrackTime(entry: SpineTrackEntry): void
{
    const duration = entryDuration(entry);
    const trackTime = entry.trackTime;

    if (!(duration > 0) || typeof trackTime !== 'number' || trackTime <= duration)
    {
        return;
    }

    entry.trackTime = trackTime % duration;

    if (typeof entry.trackLast === 'number' && entry.trackLast > duration)
    {
        entry.trackLast %= duration;
    }

    if (typeof entry.nextTrackLast === 'number' && entry.nextTrackLast > duration)
    {
        entry.nextTrackLast %= duration;
    }
}

function applyEntryLoop(entry: SpineTrackEntry, loop: boolean): void
{
    if (!loop)
    {
        if (entry.loop)
        {
            foldTrackTime(entry);
        }

        entry.loop = false;

        return;
    }

    const duration = entryDuration(entry);
    const trackTime = entry.trackTime;

    if (
        !entry.loop
        && duration > 0
        && typeof trackTime === 'number'
        && trackTime >= duration
    )
    {
        return;
    }

    entry.loop = true;
}

export function spineSetLoop(node: PixiNode, loop: boolean): void
{
    const entry = currentEntry(asSpine(node));

    if (!entry)
    {
        return;
    }

    try
    {
        applyEntryLoop(entry, loop);
    }
    catch
    {
        void 0;
    }

    const playback = playbackByNode.get(node);

    if (playback)
    {
        playback.entry = entry;
    }
}

export function spineStop(node: PixiNode): boolean
{
    const spine = asSpine(node);
    const playback = ensurePlayback(spine);

    if (!playback)
    {
        return false;
    }

    const entry = currentEntry(spine);

    if (!entry || !entryAnimationName(entry))
    {
        playback.onComplete = null;

        restoreTimeScale(playback);

        playback.entry = null;

        return false;
    }

    playback.entry = entry;
    playback.onComplete = null;

    if (playback.heldTimeScale === null)
    {
        playback.heldTimeScale = typeof playback.state.timeScale === 'number' ? playback.state.timeScale : 1;
    }

    const start = typeof entry.animationStart === 'number' ? entry.animationStart : 0;

    try
    {
        playback.state.timeScale = 0;
        entry.trackTime = start;

        if (typeof entry.trackLast === 'number')
        {
            entry.trackLast = -1;
        }

        if (typeof entry.nextTrackLast === 'number')
        {
            entry.nextTrackLast = -1;
        }
    }
    catch
    {
        return false;
    }

    try
    {
        spine.update?.(0);
    }
    catch
    {
        void 0;
    }

    return true;
}

export function spineRelease(node: PixiNode): void
{
    const playback = playbackByNode.get(node);

    if (!playback)
    {
        return;
    }

    playback.entry = null;
    playback.onComplete = null;

    restoreTimeScale(playback);

    try
    {
        playback.state.removeListener?.(playback.listener);
    }
    catch
    {
        void 0;
    }

    playbackByNode.delete(node);
}
