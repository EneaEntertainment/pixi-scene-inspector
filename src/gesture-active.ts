export type GestureGate = {
    isActive: () => boolean;
    begin: () => void;
    end: () => void;
};

export function createGestureGate(): GestureGate
{
    let count = 0;

    return {
        isActive: () => count > 0,

        begin: () =>
        {
            count += 1;
        },

        end: () =>
        {
            if (count > 0)
            {
                count -= 1;
            }
        },
    };
}

export const numberDragGesture = createGestureGate();
export const treeDragGesture = createGestureGate();
export const highlightTransformGesture = createGestureGate();

export function isBlockingGestureActive(): boolean
{
    return numberDragGesture.isActive()
        || treeDragGesture.isActive()
        || highlightTransformGesture.isActive();
}
