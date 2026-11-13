export function scaleRatioAlongAxis(
    dist: number,
    startDist: number,
    axisX: number,
    axisY: number,
    startScale = 1,
): number
{
    if (!(Math.abs(startDist) > 1e-6))
    {
        return 1;
    }

    if (Math.abs(axisY) >= Math.abs(axisX))
    {
        const sense = (axisY >= 0 ? 1 : -1) * (startScale < 0 ? -1 : 1);

        return 1 + ((sense * (dist - startDist)) / Math.abs(startDist));
    }

    return dist / startDist;
}
