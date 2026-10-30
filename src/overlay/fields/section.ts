import { createExportButton } from '../export/button';

export function createSection(title: string, initiallyExpanded: boolean, onExportClick: () => void): {
    root: HTMLElement;
    body: HTMLElement;
    setExpanded: (expanded: boolean) => void;
    setExportEnabled: (enabled: boolean) => void;
}
{
    const root = document.createElement('section');

    Object.assign(root.style, {
        borderRadius : '4px',
        background   : '#3d3d3d',
        overflow     : 'hidden',
    });

    const header = document.createElement('div');

    Object.assign(header.style, {
        display    : 'flex',
        alignItems : 'center',
        gap        : '4px',
        minHeight  : '24px',
        padding    : '4px 6px 4px 8px',
        boxSizing  : 'border-box',
    });

    const toggle = document.createElement('button');

    toggle.type = 'button';

    Object.assign(toggle.style, {
        display    : 'flex',
        alignItems : 'center',
        gap        : '6px',
        flex       : '1',
        minWidth   : '0',
        minHeight  : '20px',
        padding    : '0',
        border     : '0',
        appearance : 'none',
        background : 'transparent',
        color      : 'inherit',
        font       : 'inherit',
        fontSize   : '12px',
        fontWeight : '600',
        textAlign  : 'left',
        cursor     : 'pointer',
        userSelect : 'none',
        boxSizing  : 'border-box',
    });

    const chevron = document.createElement('span');

    Object.assign(chevron.style, {
        display    : 'inline-block',
        width      : '10px',
        flexShrink : '0',
        fontSize   : '10px',
        lineHeight : '1',
        opacity    : '0.85',
    });

    const label = document.createElement('span');

    label.textContent = title;

    Object.assign(label.style, {
        minWidth     : '0',
        overflow     : 'hidden',
        textOverflow : 'ellipsis',
        whiteSpace   : 'nowrap',
    });

    toggle.appendChild(chevron);
    toggle.appendChild(label);

    let exportEnabled = true;

    const exportBtn = createExportButton(() =>
    {
        if (!exportEnabled)
        {
            return;
        }

        onExportClick();
    });

    function applyExportEnabled()
    {
        exportBtn.disabled = !exportEnabled;
        exportBtn.style.opacity = exportEnabled ? '1' : '0.35';
        exportBtn.style.cursor = exportEnabled ? 'pointer' : 'default';
        exportBtn.style.pointerEvents = exportEnabled ? 'auto' : 'none';
    }

    header.appendChild(toggle);
    header.appendChild(exportBtn);

    const body = document.createElement('div');

    Object.assign(body.style, {
        display       : 'flex',
        flexDirection : 'column',
        gap           : '6px',
        padding       : '0 8px 8px',
        boxSizing     : 'border-box',
    });

    let expanded = initiallyExpanded;

    function applyExpanded()
    {
        body.style.display = expanded ? 'flex' : 'none';
        chevron.textContent = expanded ? '▼' : '▶';

        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    toggle.addEventListener('click', () =>
    {
        expanded = !expanded;

        applyExpanded();
    });

    applyExpanded();
    applyExportEnabled();
    root.appendChild(header);
    root.appendChild(body);

    return {
        root,
        body,

        setExpanded: (next) =>
        {
            expanded = next;

            applyExpanded();
        },

        setExportEnabled: (enabled) =>
        {
            exportEnabled = enabled;

            applyExportEnabled();
        },
    };
}
