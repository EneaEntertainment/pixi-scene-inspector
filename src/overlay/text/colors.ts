export function isRgbColorArray(value: unknown): value is ArrayLike<number>
{
    if (Array.isArray(value))
    {
        if (value.length < 3 || value.length > 4)
        {
            return false;
        }

        if (!value.every((entry) => typeof entry === 'number' && Number.isFinite(entry)))
        {
            return false;
        }

        return !value.some((entry) => entry > 255);
    }

    if (
        value instanceof Float32Array
        || value instanceof Uint8Array
        || value instanceof Uint8ClampedArray
    )
    {
        return value.length >= 3 && value.length <= 4;
    }

    return false;
}

function rgbColorArrayUsesBytes(value: ArrayLike<number>): boolean
{
    if (value instanceof Uint8Array || value instanceof Uint8ClampedArray)
    {
        return true;
    }

    return Number(value[0]) > 1 || Number(value[1]) > 1 || Number(value[2]) > 1;
}

function rgbColorArrayToHex(value: ArrayLike<number>): string
{
    const bytes = rgbColorArrayUsesBytes(value);

    const toByte = (component: number) =>
    {
        const scaled = bytes ? component : component * 255;

        return Math.max(0, Math.min(255, Math.round(scaled)));
    };

    const hex = [toByte(Number(value[0])), toByte(Number(value[1])), toByte(Number(value[2]))]
        .map((component) => component.toString(16).padStart(2, '0'))
        .join('');

    return `#${hex}`;
}

function parsedColorToRgb01(parsed: string | number): Array<number> | null
{
    if (typeof parsed === 'number' && Number.isFinite(parsed))
    {
        const int = parsed >>> 0;

        return [
            ((int >> 16) & 255) / 255,
            ((int >> 8) & 255) / 255,
            (int & 255) / 255,
        ];
    }

    if (typeof parsed !== 'string' || parsed.trim() === '')
    {
        return null;
    }

    const hex = cssColorToHex6(parsed);

    if (!hex)
    {
        return null;
    }

    const int = Number.parseInt(hex.slice(1), 16);

    return [
        ((int >> 16) & 255) / 255,
        ((int >> 8) & 255) / 255,
        (int & 255) / 255,
    ];
}

export function cssColorToHex6(value: string): string | null
{
    const trimmed = value.trim();

    if (trimmed === '')
    {
        return null;
    }

    if ((/^#([0-9a-fA-F]{3})$/).test(trimmed))
    {
        const r = trimmed[1];
        const g = trimmed[2];
        const b = trimmed[3];

        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    if ((/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/).test(trimmed))
    {
        return trimmed.slice(0, 7).toLowerCase();
    }

    if ((/^0x[0-9a-fA-F]+$/).test(trimmed))
    {
        return `#${Number(trimmed).toString(16).padStart(6, '0').slice(-6)}`;
    }

    if ((/^[0-9]+$/).test(trimmed))
    {
        return `#${Number(trimmed).toString(16).padStart(6, '0').slice(-6)}`;
    }

    if (typeof document === 'undefined')
    {
        return null;
    }

    const canvas = document.createElement('canvas');

    canvas.width = 1;
    canvas.height = 1;

    const ctx = canvas.getContext('2d');

    if (!ctx)
    {
        return null;
    }

    ctx.fillStyle = '#000000';
    ctx.fillStyle = trimmed;

    const normalized = String(ctx.fillStyle);

    if ((/^#[0-9a-fA-F]{6}$/).test(normalized))
    {
        return normalized.toLowerCase();
    }

    const rgb = (/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/).exec(normalized);

    if (!rgb)
    {
        return null;
    }

    const hex = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
        .map((component) => Math.max(0, Math.min(255, component)).toString(16).padStart(2, '0'))
        .join('');

    return `#${hex}`;
}

export function replaceRgbColorArray(current: ArrayLike<number>, parsed: string | number): ArrayLike<number>
{
    const rgb = parsedColorToRgb01(parsed);

    if (!rgb)
    {
        return current;
    }

    const bytes = rgbColorArrayUsesBytes(current);
    const components: Array<number> = bytes
        ? [
            Math.round(rgb[0] * 255),
            Math.round(rgb[1] * 255),
            Math.round(rgb[2] * 255),
        ]
        : [rgb[0], rgb[1], rgb[2]];

    if (current.length > 3)
    {
        components.push(Number(current[3]));
    }

    if (Array.isArray(current))
    {
        return components;
    }

    if (current instanceof Float32Array)
    {
        return Float32Array.from(components);
    }

    if (current instanceof Uint8ClampedArray)
    {
        return Uint8ClampedArray.from(components);
    }

    if (current instanceof Uint8Array)
    {
        return Uint8Array.from(components);
    }

    return components;
}

export function writeColorValue(current: unknown, parsed: string | number): unknown
{
    if (isRgbColorArray(current))
    {
        return replaceRgbColorArray(current, parsed);
    }

    if (
        current
        && typeof current === 'object'
        && !Array.isArray(current)
        && isPlainColorSource(current)
    )
    {
        const record = current as Record<string, unknown>;

        if ('color' in record)
        {
            return { ...record, color: writeColorValue(record.color, parsed) };
        }

        return { ...record, color: parsed };
    }

    return parsed;
}

export function colorToString(value: unknown): string | undefined
{
    if (typeof value === 'string')
    {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value))
    {
        const hex = (value >>> 0).toString(16).padStart(6, '0');

        return `#${hex.slice(-6)}`;
    }

    if (isRgbColorArray(value))
    {
        return rgbColorArrayToHex(value);
    }

    if (value && typeof value === 'object')
    {
        const record = value as Record<string, unknown>;

        if ('toHex' in record && typeof record.toHex === 'function')
        {
            try
            {
                const hex = (record.toHex as () => unknown)();

                if (typeof hex === 'string')
                {
                    return hex;
                }
            }
            catch
            {
                void 0;
            }
        }

        if ('toNumber' in record && typeof record.toNumber === 'function')
        {
            try
            {
                const num = (record.toNumber as () => unknown)();

                if (typeof num === 'number')
                {
                    return colorToString(num);
                }
            }
            catch
            {
                void 0;
            }
        }
    }

    return undefined;
}

export function parseColorString(value: string): string | number
{
    const trimmed = value.trim();

    if (trimmed === '')
    {
        return trimmed;
    }

    if ((/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).test(trimmed))
    {
        return trimmed;
    }

    if ((/^0x[0-9a-fA-F]+$/).test(trimmed))
    {
        return Number(trimmed);
    }

    if ((/^[0-9]+$/).test(trimmed))
    {
        return Number(trimmed);
    }

    return trimmed;
}

export function isPlainColorSource(value: unknown): boolean
{
    if (typeof value === 'string' || typeof value === 'number')
    {
        return true;
    }

    if (!value || typeof value !== 'object')
    {
        return false;
    }

    if (Array.isArray(value) || isRgbColorArray(value))
    {
        return false;
    }

    const record = value as Record<string, unknown>;

    if ('color' in record || 'alpha' in record)
    {
        if ('fill' in record && record.fill !== undefined && record.fill !== null)
        {
            return false;
        }

        return true;
    }

    if ('toHex' in record || 'toNumber' in record)
    {
        return true;
    }

    return false;
}
