export function dockBottomIconSvg(): string
{
    return (
        '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
        + '<rect x="1.5" y="1.5" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"/>'
        + '<rect x="1.5" y="8" width="11" height="4.5" fill="currentColor"/>'
        + '</svg>'
    );
}

export function dockRightIconSvg(): string
{
    return (
        '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
        + '<rect x="1.5" y="1.5" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"/>'
        + '<rect x="8" y="1.5" width="4.5" height="11" fill="currentColor"/>'
        + '</svg>'
    );
}

export function floatIconSvg(): string
{
    return (
        '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
        + '<rect x="1.5" y="3.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5"/>'
        + '<path d="M5 1.5h7.5V9" fill="none" stroke="currentColor" stroke-width="1.5"/>'
        + '</svg>'
    );
}

export function copyIconSvg(): string
{
    return (
        '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
        + '<rect x="4.5" y="4.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>'
        + '<path d="M9.5 4.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1"'
        + ' fill="none" stroke="currentColor" stroke-width="1.5"/>'
        + '</svg>'
    );
}

export function exportIconSvg(size = 14): string
{
    return (
        `<svg width="${size}" height="${size}" viewBox="0 0 14 14" aria-hidden="true">`
        + '<path d="M7 1.5v7" fill="none" stroke="currentColor" stroke-width="1.5"'
        + ' stroke-linecap="round"/>'
        + '<path d="M4.5 4 7 1.5 9.5 4" fill="none" stroke="currentColor"'
        + ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M2.5 8.5v2a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" fill="none"'
        + ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
        + '</svg>'
    );
}

export function closeIconSvg(size = 12): string
{
    return (
        `<svg width="${size}" height="${size}" viewBox="0 0 14 14" aria-hidden="true">`
        + '<path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5" fill="none"'
        + ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
        + '</svg>'
    );
}

export function objectTabIconSvg(size = 16): string
{
    return (
        `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">`
        + '<path fill="#dd8f48" d="M8 1.2 13.5 4.2v7.6L8 14.8 2.5 11.8V4.2L8 1.2zm0'
        + ' 1.55L4 5.05v5.9l4 2.3 4-2.3v-5.9L8 2.75z"/>'
        + '<path fill="#dd8f48" d="M8 7.1 12.2 4.75v1.7L8 8.85 3.8 6.45v-1.7L8 7.1z"/>'
        + '</svg>'
    );
}

export function textTabIconSvg(size = 16): string
{
    return (
        `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">`
        + '<path fill="#43c696" d="M3 2.5h10v2.25H9.35V13.5H6.65V4.75H3z"/>'
        + '</svg>'
    );
}
