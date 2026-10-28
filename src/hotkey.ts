export type HotkeyChord = {
    code: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
};

export const DEFAULT_TOGGLE_HOTKEY: HotkeyChord = {
    code  : 'Backquote',
    shift : true,
    ctrl  : false,
    alt   : false,
    meta  : false,
};

export const HOTKEY_CONFIG_EVENT = 'pixi-scene-inspector-hotkey-config';
export const HOTKEY_ATTR = 'data-psi-hotkey';

const CODE_LABELS: Record<string, string> = {
    Backquote     : '`',
    IntlBackslash : '`',
    Minus         : '-',
    Equal         : '=',
    BracketLeft   : '[',
    BracketRight  : ']',
    Backslash     : '\\',
    Semicolon     : ';',
    Quote         : '\'',
    Comma         : ',',
    Period        : '.',
    Slash         : '/',
    Space         : 'Space',
    Escape        : 'Esc',
    Enter         : 'Enter',
    Tab           : 'Tab',
    Backspace     : 'Backspace',
    Delete        : 'Delete',
    ArrowUp       : '↑',
    ArrowDown     : '↓',
    ArrowLeft     : '←',
    ArrowRight    : '→',
};

function asBoolean(value: unknown): boolean
{
    return value === true;
}

export function normalizeHotkeyChord(raw: unknown): HotkeyChord | undefined
{
    if (!raw || typeof raw !== 'object')
    {
        return undefined;
    }

    const record = raw as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : '';

    if (!code)
    {
        return undefined;
    }

    return {
        code,
        shift : asBoolean(record.shift),
        ctrl  : asBoolean(record.ctrl),
        alt   : asBoolean(record.alt),
        meta  : asBoolean(record.meta),
    };
}

export function hotkeyFromKeyboardEvent(event: KeyboardEvent): HotkeyChord | undefined
{
    if (
        event.key === 'Shift'
        || event.key === 'Control'
        || event.key === 'Alt'
        || event.key === 'Meta'
    )
    {
        return undefined;
    }

    if (!event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey)
    {
        return undefined;
    }

    return {
        code  : event.code,
        shift : event.shiftKey,
        ctrl  : event.ctrlKey,
        alt   : event.altKey,
        meta  : event.metaKey,
    };
}

function codesMatch(eventCode: string, chordCode: string): boolean
{
    if (eventCode === chordCode)
    {
        return true;
    }

    const backtickFamily = eventCode === 'Backquote' || eventCode === 'IntlBackslash';

    return backtickFamily && (chordCode === 'Backquote' || chordCode === 'IntlBackslash');
}

export function matchesHotkey(event: KeyboardEvent, chord: HotkeyChord): boolean
{
    return codesMatch(event.code, chord.code)
        && event.shiftKey === chord.shift
        && event.ctrlKey === chord.ctrl
        && event.altKey === chord.alt
        && event.metaKey === chord.meta;
}

function labelForCode(code: string): string
{
    const mapped = CODE_LABELS[code];

    if (mapped)
    {
        return mapped;
    }

    if (code.startsWith('Key') && code.length === 4)
    {
        return code.slice(3);
    }

    if (code.startsWith('Digit') && code.length === 6)
    {
        return code.slice(5);
    }

    if (code.startsWith('Numpad') && code.length > 6)
    {
        return `Num${code.slice(6)}`;
    }

    return code;
}

export function formatHotkey(chord: HotkeyChord): string
{
    const parts: Array<string> = [];

    if (chord.ctrl)
    {
        parts.push('Ctrl');
    }

    if (chord.alt)
    {
        parts.push('Alt');
    }

    if (chord.shift)
    {
        parts.push('Shift');
    }

    if (chord.meta)
    {
        parts.push('⌘');
    }

    parts.push(labelForCode(chord.code));

    return parts.join('+');
}

export function readHotkeyAttr(element: Element = document.documentElement): HotkeyChord | undefined
{
    return normalizeHotkeyChord(
        (() =>
        {
            const raw = element.getAttribute(HOTKEY_ATTR);

            if (!raw)
            {
                return undefined;
            }

            try
            {
                return JSON.parse(raw) as unknown;
            }
            catch
            {
                return undefined;
            }
        })(),
    );
}

export function writeHotkeyAttr(chord: HotkeyChord, element: Element = document.documentElement)
{
    element.setAttribute(HOTKEY_ATTR, JSON.stringify(chord));
}

export function publishHotkeyConfig(chord: HotkeyChord)
{
    writeHotkeyAttr(chord);
    window.dispatchEvent(new CustomEvent(HOTKEY_CONFIG_EVENT, { detail: chord }));
}
