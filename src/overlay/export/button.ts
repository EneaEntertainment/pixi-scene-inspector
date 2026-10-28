import { exportIconSvg } from '../shell/panel-icons';

export function createExportButton(onClick: () => void): HTMLButtonElement
{
    const button = document.createElement('button');

    button.title = 'Export';
    button.type = 'button';
    button.innerHTML = exportIconSvg(12);

    button.setAttribute('aria-label', 'Export properties');

    Object.assign(button.style, {
        flexShrink     : '0',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        width          : '20px',
        height         : '20px',
        marginLeft     : 'auto',
        padding        : '0',
        border         : '0',
        borderRadius   : '3px',
        appearance     : 'none',
        background     : 'transparent',
        color          : '#bdbdbd',
        cursor         : 'pointer',
        boxSizing      : 'border-box',
    });

    button.addEventListener('pointerenter', () =>
    {
        button.style.color = '#fff';
        button.style.background = '#545454';
    });

    button.addEventListener('pointerleave', () =>
    {
        button.style.color = '#bdbdbd';
        button.style.background = 'transparent';
    });

    button.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        onClick();
        button.blur();
    });

    return button;
}
