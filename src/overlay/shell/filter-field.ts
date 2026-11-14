const CLEAR_COLOR = '#ffe066';
const BORDER_IDLE = '1px solid #555';
const BORDER_FOCUS = `1px solid ${CLEAR_COLOR}`;

export type FilterField = {
    root: HTMLElement;
    input: HTMLInputElement;
    setValue: (value: string) => void;
    destroy: () => void;
};

type FilterFieldOptions = {
    placeholder: string;
    ariaLabel: string;
    onChange: (value: string) => void;
    height?: string;
    fontSize?: string;
    flex?: string;
    width?: string;
};

export function createFilterField(options: FilterFieldOptions): FilterField
{
    const root = document.createElement('div');
    const input = document.createElement('input');
    const clearBtn = document.createElement('button');

    Object.assign(root.style, {
        position   : 'relative',
        display    : 'flex',
        alignItems : 'center',
        minWidth   : '0',
        flex       : options.flex ?? '1',
        width      : options.width,
        boxSizing  : 'border-box',
    });

    input.type = 'text';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = options.placeholder;

    input.setAttribute('aria-label', options.ariaLabel);

    Object.assign(input.style, {
        flex         : '1',
        minWidth     : '0',
        width        : '100%',
        height       : options.height ?? '26px',
        margin       : '0',
        padding      : '2px 24px 2px 8px',
        border       : BORDER_IDLE,
        borderRadius : '4px',
        outline      : 'none',
        background   : '#222',
        color        : '#e5e5e5',
        font         : 'inherit',
        fontSize     : options.fontSize ?? '12px',
        boxSizing    : 'border-box',
    });

    clearBtn.type = 'button';
    clearBtn.textContent = '×';
    clearBtn.title = 'Clear filter';

    clearBtn.setAttribute('aria-label', 'Clear filter');

    Object.assign(clearBtn.style, {
        position       : 'absolute',
        right          : '4px',
        top            : '50%',
        transform      : 'translateY(-50%)',
        display        : 'none',
        alignItems     : 'center',
        justifyContent : 'center',
        width          : '18px',
        height         : '18px',
        margin         : '0',
        padding        : '0',
        border         : '0',
        borderRadius   : '3px',
        appearance     : 'none',
        background     : 'transparent',
        color          : CLEAR_COLOR,
        font           : 'inherit',
        fontSize       : '14px',
        fontWeight     : '700',
        lineHeight     : '1',
        cursor         : 'pointer',
        boxSizing      : 'border-box',
    });

    function syncClear()
    {
        const empty = input.value.length === 0;

        clearBtn.style.display = empty ? 'none' : 'flex';
        clearBtn.hidden = empty;
    }

    function setValue(value: string)
    {
        input.value = value;

        syncClear();
    }

    input.addEventListener('focus', () =>
    {
        input.style.border = BORDER_FOCUS;
    });

    input.addEventListener('blur', () =>
    {
        input.style.border = BORDER_IDLE;
    });

    input.addEventListener('input', () =>
    {
        syncClear();
        options.onChange(input.value);
    });

    clearBtn.addEventListener('click', (event) =>
    {
        event.preventDefault();
        event.stopPropagation();
        setValue('');
        options.onChange('');
        input.focus();
    });

    clearBtn.addEventListener('mouseenter', () =>
    {
        clearBtn.style.color = '#fff3a8';
    });

    clearBtn.addEventListener('mouseleave', () =>
    {
        clearBtn.style.color = CLEAR_COLOR;
    });

    root.append(input, clearBtn);

    return {
        root,
        input,
        setValue,
        destroy: () =>
        {
            root.remove();
        },
    };
}
