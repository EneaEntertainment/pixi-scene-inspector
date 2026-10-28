import { objectTabIconSvg, textTabIconSvg } from '../shell/panel-icons';

export type PropertiesTabId = 'object' | 'text';

type PropertiesTabSpec = {
    id: PropertiesTabId;
    label: string;
    iconHtml: string;
};

type PropertiesTabs = {
    root: HTMLElement;
    active: () => PropertiesTabId;
    setActive: (id: PropertiesTabId) => void;
    setTextAvailable: (available: boolean) => void;
    destroy: () => void;
};

const TABS: Array<PropertiesTabSpec> = [
    {
        id       : 'object',
        label    : 'Object Properties',
        iconHtml : objectTabIconSvg(),
    },
    {
        id       : 'text',
        label    : 'Text Properties',
        iconHtml : textTabIconSvg(),
    },
];

export function createPropertiesTabs(initial: PropertiesTabId, onChange: (id: PropertiesTabId) => void): PropertiesTabs
{
    const root = document.createElement('div');

    Object.assign(root.style, {
        flexShrink    : '0',
        display       : 'flex',
        flexDirection : 'row',
        alignItems    : 'center',
        gap           : '2px',
        padding       : '6px 8px 0',
        overflowX     : 'auto',
        overflowY     : 'hidden',
        background    : '#181818',
        borderBottom  : '1px solid #2e2e2e',
        boxSizing     : 'border-box',
    });

    root.setAttribute('role', 'tablist');
    root.setAttribute('aria-orientation', 'horizontal');
    root.setAttribute('aria-label', 'Property tabs');

    let active: PropertiesTabId = initial;
    let textAvailable = true;
    const buttons = new Map<PropertiesTabId, HTMLButtonElement>();

    function tabOpacity(id: PropertiesTabId, isActive: boolean): string
    {
        if (id === 'text' && !textAvailable)
        {
            return '0.28';
        }

        return isActive ? '1' : '0.75';
    }

    function applyActive()
    {
        for (const [id, button] of buttons)
        {
            const isActive = id === active;
            const available = id !== 'text' || textAvailable;

            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.setAttribute('aria-disabled', available ? 'false' : 'true');

            button.tabIndex = available ? 0 : -1;
            button.style.background = isActive ? '#303030' : 'transparent';
            button.style.borderBottomColor = isActive ? '#303030' : 'transparent';
            button.style.opacity = tabOpacity(id, isActive);
            button.style.cursor = available ? 'pointer' : 'default';
        }
    }

    function setActive(id: PropertiesTabId)
    {
        if (id === 'text' && !textAvailable)
        {
            return;
        }

        if (active === id)
        {
            return;
        }

        active = id;

        applyActive();
        onChange(id);
    }

    function setTextAvailable(available: boolean)
    {
        if (textAvailable === available)
        {
            return;
        }

        textAvailable = available;

        if (!available && active === 'text')
        {
            active = 'object';

            applyActive();
            onChange('object');

            return;
        }

        applyActive();
    }

    function bindTabButton(tab: PropertiesTabSpec, button: HTMLButtonElement)
    {
        button.addEventListener('mouseenter', () =>
        {
            if (tab.id === 'text' && !textAvailable)
            {
                return;
            }

            if (active !== tab.id)
            {
                button.style.background = '#2a2a2a';
            }

            button.style.opacity = '1';
        });

        button.addEventListener('mouseleave', () =>
        {
            button.style.background = active === tab.id ? '#303030' : 'transparent';
            button.style.borderBottomColor = active === tab.id ? '#303030' : 'transparent';
            button.style.opacity = tabOpacity(tab.id, active === tab.id);
        });

        button.addEventListener('focus', () =>
        {
            if (tab.id === 'text' && !textAvailable)
            {
                return;
            }

            button.style.outline = '1px solid #4772b3';
            button.style.outlineOffset = '-1px';
        });

        button.addEventListener('blur', () =>
        {
            button.style.outline = 'none';
        });

        button.addEventListener('mousedown', (event) =>
        {
            event.preventDefault();
            setActive(tab.id);
        });
    }

    for (const tab of TABS)
    {
        const button = document.createElement('button');

        button.setAttribute('aria-label', tab.label);
        button.setAttribute('role', 'tab');

        button.type = 'button';
        button.innerHTML = tab.iconHtml;
        button.title = tab.label;

        Object.assign(button.style, {
            position             : 'relative',
            boxSizing            : 'border-box',
            width                : '28px',
            height               : '26px',
            marginBottom         : '-1px',
            padding              : '0',
            border               : '1px solid transparent',
            borderTopLeftRadius  : '4px',
            borderTopRightRadius : '4px',
            appearance           : 'none',
            background           : 'transparent',
            outline              : 'none',
            cursor               : 'pointer',
            display              : 'flex',
            alignItems           : 'center',
            justifyContent       : 'center',
            flexShrink           : '0',
            color                : 'inherit',
        });

        bindTabButton(tab, button);
        buttons.set(tab.id, button);
        root.appendChild(button);
    }

    applyActive();

    return {
        root,
        active  : () => active,
        setActive,
        setTextAvailable,
        destroy : () =>
        {
            root.remove();
        },
    };
}
