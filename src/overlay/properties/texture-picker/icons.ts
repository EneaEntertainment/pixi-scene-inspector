export type TexturePickerViewMode =
    | 'thumb-sm'
    | 'thumb-md'
    | 'thumb-lg'
    | 'list'
    | 'list-miller';

export type TexturePickerFlatViewMode = Exclude<TexturePickerViewMode, 'list-miller'>;

export const THUMB_SIZES: Record<Exclude<TexturePickerFlatViewMode, 'list'>, number> = {
    'thumb-sm' : 40,
    'thumb-md' : 64,
    'thumb-lg' : 96,
};

export function viewIconSvg(kind: TexturePickerViewMode): string
{
    if (kind === 'list')
    {
        return (
            '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
            + '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"'
            + ' d="M3 3.5h8M3 7h8M3 10.5h8"/>'
            + '</svg>'
        );
    }

    if (kind === 'list-miller')
    {
        return (
            '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
            + '<rect x="1.5" y="1.5" width="3.5" height="11" fill="none" stroke="currentColor" stroke-width="1.2"/>'
            + '<rect x="5.25" y="1.5" width="3.5" height="11" fill="none" stroke="currentColor" stroke-width="1.2"/>'
            + '<rect x="9" y="1.5" width="3.5" height="11" fill="none" stroke="currentColor" stroke-width="1.2"/>'
            + '</svg>'
        );
    }

    let cells = 1;

    if (kind === 'thumb-sm')
    {
        cells = 3;
    }
    else if (kind === 'thumb-md')
    {
        cells = 2;
    }

    const gap = 1.2;
    const pad = 2;
    const area = 14 - (pad * 2);
    const cell = (area - (gap * (cells - 1))) / cells;
    let body = '';

    for (let y = 0; y < cells; y++)
    {
        for (let x = 0; x < cells; x++)
        {
            const left = pad + (x * (cell + gap));
            const top = pad + (y * (cell + gap));

            body += `<rect x="${left}" y="${top}" width="${cell}" height="${cell}"`
                + ' fill="none" stroke="currentColor" stroke-width="1.2"/>';
        }
    }

    return `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${body}</svg>`;
}
