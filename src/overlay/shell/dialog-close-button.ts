import { closeIconSvg } from './panel-icons';

export function createDialogCloseButton(onClose: () => void): HTMLButtonElement
{
    const closeBtn = document.createElement('button');

    closeBtn.type = 'button';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = closeIconSvg();

    closeBtn.setAttribute('aria-label', 'Close');

    Object.assign(closeBtn.style, {
        flexShrink     : '0',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        width          : '20px',
        height         : '20px',
        margin         : '0',
        padding        : '0',
        border         : '0',
        borderRadius   : '3px',
        appearance     : 'none',
        background     : 'transparent',
        color          : '#bdbdbd',
        cursor         : 'pointer',
        boxSizing      : 'border-box',
    });

    closeBtn.addEventListener('pointerenter', () =>
    {
        closeBtn.style.color = '#fff';
        closeBtn.style.background = '#545454';
    });

    closeBtn.addEventListener('pointerleave', () =>
    {
        closeBtn.style.color = '#bdbdbd';
        closeBtn.style.background = 'transparent';
    });

    closeBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        onClose();
    });

    return closeBtn;
}
