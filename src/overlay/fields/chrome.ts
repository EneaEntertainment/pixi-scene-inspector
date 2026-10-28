export const FIELD_ROW_STYLE: Record<string, string> = {
    display    : 'flex',
    alignItems : 'center',
    gap        : '8px',
    minHeight  : '22px',
};

export const FIELD_LABEL_STYLE: Record<string, string> = {
    flex         : '1',
    minWidth     : '0',
    overflow     : 'hidden',
    textOverflow : 'ellipsis',
    whiteSpace   : 'nowrap',
    textAlign    : 'right',
    fontSize     : '11px',
    color        : '#cfcfcf',
    userSelect   : 'none',
};

export const FIELD_CONTROL_FLEX = '2';

export function createFieldLabel(text: string): HTMLElement
{
    const label = document.createElement('div');

    label.textContent = text;

    Object.assign(label.style, FIELD_LABEL_STYLE);

    return label;
}

export function createFieldRoot(): HTMLElement
{
    const root = document.createElement('div');

    Object.assign(root.style, FIELD_ROW_STYLE);

    return root;
}
