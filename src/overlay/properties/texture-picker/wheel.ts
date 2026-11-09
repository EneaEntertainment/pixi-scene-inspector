export function attachTexturePickerWheel(grid: HTMLElement, isColumnMode: () => boolean): () => void
{
    const onGridWheel = (event: WheelEvent) =>
    {
        let delta = event.deltaY;

        if (event.deltaMode === 1)
        {
            delta *= 16;
        }
        else if (event.deltaMode === 2)
        {
            delta *= isColumnMode() ? grid.clientWidth : grid.clientHeight;
        }

        if (isColumnMode())
        {
            const target = event.target;

            if (target instanceof Element)
            {
                const column = target.closest('[data-texture-picker-column]');

                if (
                    column instanceof HTMLElement
                    && grid.contains(column)
                    && column.scrollHeight > column.clientHeight
                )
                {
                    const maxY = column.scrollHeight - column.clientHeight;
                    const prevY = column.scrollTop;
                    const nextY = Math.min(maxY, Math.max(0, prevY + delta));

                    if (nextY !== prevY)
                    {
                        column.scrollTop = nextY;

                        event.preventDefault();

                        return;
                    }
                }
            }

            const maxX = grid.scrollWidth - grid.clientWidth;

            if (maxX <= 0)
            {
                return;
            }

            const prevX = grid.scrollLeft;
            const nextX = Math.min(maxX, Math.max(0, prevX + delta));

            if (nextX === prevX)
            {
                return;
            }

            grid.scrollLeft = nextX;

            event.preventDefault();

            return;
        }

        const maxScroll = grid.scrollHeight - grid.clientHeight;

        if (maxScroll <= 0)
        {
            return;
        }

        const prev = grid.scrollTop;
        const next = Math.min(maxScroll, Math.max(0, prev + delta));

        if (next === prev)
        {
            return;
        }

        grid.scrollTop = next;

        event.preventDefault();
    };

    grid.addEventListener('wheel', onGridWheel, { passive: false });

    return () =>
    {
        grid.removeEventListener('wheel', onGridWheel);
    };
}
