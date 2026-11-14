import type { PixiNode } from './pixi-node';

type AnimationStateLike = {
    playing: boolean;
    loop: boolean;
    time: number;
    weight: number;
    onComplete: (() => void) | null;
    play: () => AnimationStateLike;
    stop: () => AnimationStateLike;
    gotoAndPlay: (time: number) => AnimationStateLike;
    gotoAndStop: (time: number) => AnimationStateLike;
};

type AnimationPlayerLike = {
    playing: boolean;
    animationLabels: ReadonlyArray<string> | Array<string>;
    play: (label: string) => AnimationStateLike;
    stop: () => void;
    getState: (label: string) => AnimationStateLike;
    getAnimation?: (label: string) => unknown;
};

type Model3DNode = PixiNode & {
    player?: AnimationPlayerLike;
};

type Playback = {
    player: AnimationPlayerLike;
    label: string | null;
    onComplete: (() => void) | null;
    paused: boolean;
};

export type Model3DPlaybackInfo = {
    animationName: string | undefined;
    playing: boolean;
    paused: boolean;
    loop: boolean;
};

export type Model3DAnimationSelection = {
    name: string;
    loop: boolean;
};

const playbackByNode = new WeakMap<PixiNode, Playback>();
const selectionByNode = new WeakMap<PixiNode, Model3DAnimationSelection>();

function asModel(node: PixiNode): Model3DNode
{
    return node as Model3DNode;
}

function isPlayerLike(value: unknown): value is AnimationPlayerLike
{
    if (!value || typeof value !== 'object')
    {
        return false;
    }

    const player = value as AnimationPlayerLike;

    return (
        typeof player.play === 'function'
        && typeof player.stop === 'function'
        && typeof player.getState === 'function'
        && Array.isArray(player.animationLabels)
    );
}

function isModel3DPlayerLike(node: PixiNode): boolean
{
    return isPlayerLike(asModel(node).player);
}

export function resolveModel3DPlayerHost(node: PixiNode | null | undefined): PixiNode | null
{
    if (!node)
    {
        return null;
    }

    if (isModel3DPlayerLike(node) && model3dAnimationNames(node).length > 0)
    {
        return node;
    }

    return null;
}

function getPlayer(node: PixiNode): AnimationPlayerLike | null
{
    const player = asModel(node).player;

    return isPlayerLike(player) ? player : null;
}

function stateFor(player: AnimationPlayerLike, label: string): AnimationStateLike | null
{
    if (label === '')
    {
        return null;
    }

    if (typeof player.getAnimation === 'function' && player.getAnimation(label) === undefined)
    {
        return null;
    }

    try
    {
        return player.getState(label);
    }
    catch
    {
        return null;
    }
}

function playingLabel(player: AnimationPlayerLike): string | undefined
{
    const labels = player.animationLabels;

    for (let i = 0; i < labels.length; i++)
    {
        const label = labels[i];

        if (!label)
        {
            continue;
        }

        const state = stateFor(player, label);

        if (state?.playing)
        {
            return label;
        }
    }

    return undefined;
}

function clearCompleteHandler(playback: Playback): void
{
    if (!playback.label)
    {
        playback.onComplete = null;

        return;
    }

    const state = stateFor(playback.player, playback.label);

    if (state && state.onComplete)
    {
        state.onComplete = null;
    }

    playback.onComplete = null;
}

function ensurePlayback(node: PixiNode): Playback | null
{
    const player = getPlayer(node);

    if (!player)
    {
        return null;
    }

    const existing = playbackByNode.get(node);

    if (existing?.player === player)
    {
        return existing;
    }

    if (existing)
    {
        clearCompleteHandler(existing);
        playbackByNode.delete(node);
    }

    const playback: Playback = {
        player,
        label      : null,
        onComplete : null,
        paused     : false,
    };

    playbackByNode.set(node, playback);

    return playback;
}

export function model3dSetAnimationSelection(node: PixiNode, name: string, loop: boolean)
{
    if (name === '')
    {
        selectionByNode.delete(node);

        return;
    }

    selectionByNode.set(node, { name, loop });
}

export function model3dAnimationSelection(node: PixiNode): Model3DAnimationSelection | undefined
{
    const selection = selectionByNode.get(node);

    if (!selection)
    {
        return undefined;
    }

    const names = model3dAnimationNames(node);

    if (!names.includes(selection.name))
    {
        return undefined;
    }

    return selection;
}

export function model3dAnimationNames(node: PixiNode): Array<string>
{
    const player = getPlayer(node);

    if (!player)
    {
        return [];
    }

    const names: Array<string> = [];

    for (let i = 0; i < player.animationLabels.length; i++)
    {
        const label = player.animationLabels[i];

        if (typeof label === 'string' && label !== '')
        {
            names.push(label);
        }
    }

    return names;
}

export function model3dPlaybackInfo(node: PixiNode): Model3DPlaybackInfo
{
    const player = getPlayer(node);

    if (!player)
    {
        return {
            animationName : undefined,
            playing       : false,
            paused        : false,
            loop          : false,
        };
    }

    const playback = playbackByNode.get(node);
    const active = playingLabel(player);
    const animationName = active
        ?? (playback?.label && stateFor(player, playback.label) ? playback.label : undefined)
        ?? undefined;

    if (!animationName)
    {
        return {
            animationName : undefined,
            playing       : false,
            paused        : false,
            loop          : false,
        };
    }

    const state = stateFor(player, animationName);

    if (!state)
    {
        return {
            animationName : undefined,
            playing       : false,
            paused        : false,
            loop          : false,
        };
    }

    const playing = state.playing;
    const paused = !playing && !!playback && playback.paused && playback.label === animationName;

    return {
        animationName,
        playing,
        paused,
        loop: !!state.loop,
    };
}

export function model3dCanResume(node: PixiNode, animationName: string): boolean
{
    const playback = playbackByNode.get(node);

    if (!playback || !playback.paused || playback.label !== animationName)
    {
        return false;
    }

    return stateFor(playback.player, animationName) !== null;
}

function bindComplete(playback: Playback, state: AnimationStateLike, onComplete: () => void): void
{
    playback.onComplete = onComplete;

    state.onComplete = () =>
    {
        if (playback.onComplete !== onComplete)
        {
            return;
        }

        playback.paused = false;
        playback.onComplete = null;
        state.onComplete = null;
        onComplete();
    };
}

export function model3dPlay(node: PixiNode, animationName: string, loop: boolean, onComplete: () => void): boolean
{
    const playback = ensurePlayback(node);

    if (!playback || animationName === '')
    {
        return false;
    }

    const state = stateFor(playback.player, animationName);

    if (!state)
    {
        return false;
    }

    clearCompleteHandler(playback);

    try
    {
        playback.player.stop();
        state.weight = 1;
        state.loop = loop;

        if (loop)
        {
            state.onComplete = null;
        }
        else
        {
            bindComplete(playback, state, onComplete);
        }

        state.gotoAndPlay(0);
    }
    catch
    {
        playback.label = null;
        playback.paused = false;
        playback.onComplete = null;

        return false;
    }

    playback.label = animationName;
    playback.paused = false;

    return true;
}

export function model3dPause(node: PixiNode): boolean
{
    const playback = ensurePlayback(node);

    if (!playback)
    {
        return false;
    }

    const label = playingLabel(playback.player) ?? playback.label;

    if (!label)
    {
        return false;
    }

    const state = stateFor(playback.player, label);

    if (!state?.playing)
    {
        return false;
    }

    try
    {
        state.stop();
    }
    catch
    {
        return false;
    }

    playback.label = label;
    playback.paused = true;

    return true;
}

export function model3dResume(node: PixiNode, loop: boolean): boolean
{
    const playback = ensurePlayback(node);

    if (!playback || !playback.label || !playback.paused)
    {
        return false;
    }

    const state = stateFor(playback.player, playback.label);

    if (!state)
    {
        return false;
    }

    try
    {
        state.loop = loop;

        if (loop)
        {
            state.onComplete = null;
            playback.onComplete = null;
        }
        else if (playback.onComplete)
        {
            bindComplete(playback, state, playback.onComplete);
        }

        state.play();
    }
    catch
    {
        return false;
    }

    playback.paused = false;

    return true;
}

export function model3dSetLoop(node: PixiNode, loop: boolean): void
{
    const player = getPlayer(node);

    if (!player)
    {
        return;
    }

    const playback = playbackByNode.get(node);
    const label = playingLabel(player) ?? playback?.label;

    if (!label)
    {
        return;
    }

    const state = stateFor(player, label);

    if (!state)
    {
        return;
    }

    try
    {
        state.loop = loop;

        if (loop)
        {
            state.onComplete = null;

            if (playback)
            {
                playback.onComplete = null;
            }
        }
    }
    catch
    {
        void 0;
    }

    if (playback)
    {
        playback.label = label;
    }
}

export function model3dStop(node: PixiNode): boolean
{
    const playback = ensurePlayback(node);

    if (!playback)
    {
        return false;
    }

    const label = playingLabel(playback.player) ?? playback.label;

    if (!label)
    {
        clearCompleteHandler(playback);
        playback.label = null;
        playback.paused = false;

        return false;
    }

    const state = stateFor(playback.player, label);

    if (!state)
    {
        clearCompleteHandler(playback);
        playback.label = null;
        playback.paused = false;

        return false;
    }

    clearCompleteHandler(playback);

    try
    {
        playback.player.stop();
        state.weight = 1;
        state.gotoAndStop(0);
    }
    catch
    {
        return false;
    }

    playback.label = label;
    playback.paused = true;

    return true;
}

export function model3dRelease(node: PixiNode): void
{
    const playback = playbackByNode.get(node);

    if (!playback)
    {
        return;
    }

    clearCompleteHandler(playback);
    playback.label = null;
    playback.paused = false;
    playbackByNode.delete(node);
}
