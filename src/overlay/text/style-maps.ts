import type {
    PropertyMapping,
    StyleRecord,
    TextBooleanPropertyKey,
    TextNumberPropertyKey,
    TextStringPropertyKey,
} from './types';

export function styleStringMap(style: StyleRecord, key: TextStringPropertyKey, prop: string): PropertyMapping<string> | null
{
    const current = style[prop];

    if (typeof current !== 'string')
    {
        return null;
    }

    return {
        key,
        get: () =>
        {
            const value = style[prop];

            return typeof value === 'string' ? value : undefined;
        },
        set: (value) =>
        {
            style[prop] = value;
        },
    };
}

export function styleNumberMap(style: StyleRecord, key: TextNumberPropertyKey, prop: string): PropertyMapping<number> | null
{
    const current = style[prop];

    if (typeof current !== 'number')
    {
        return null;
    }

    return {
        key,
        get: () =>
        {
            const value = style[prop];

            return typeof value === 'number' ? value : undefined;
        },
        set: (value) =>
        {
            style[prop] = value;
        },
    };
}

export function styleBooleanMap(
    style: StyleRecord,
    key: TextBooleanPropertyKey,
    prop: string,
): PropertyMapping<boolean> | null
{
    const current = style[prop];

    if (typeof current !== 'boolean')
    {
        return null;
    }

    return {
        key,
        get: () =>
        {
            const value = style[prop];

            return typeof value === 'boolean' ? value : undefined;
        },
        set: (value) =>
        {
            style[prop] = value;
        },
    };
}

export function fontFamilyMap(style: StyleRecord): PropertyMapping<string> | null
{
    const current = style.fontFamily;

    if (typeof current === 'string')
    {
        return {
            key : 'style.fontFamily',
            get : () =>
            {
                const value = style.fontFamily;

                return typeof value === 'string' ? value : undefined;
            },
            set: (value) =>
            {
                style.fontFamily = value;
            },
        };
    }

    if (Array.isArray(current) && current.every((entry) => typeof entry === 'string'))
    {
        return {
            key : 'style.fontFamily',
            get : () =>
            {
                const value = style.fontFamily;

                if (typeof value === 'string')
                {
                    return value;
                }

                if (Array.isArray(value))
                {
                    return value.filter((entry) => typeof entry === 'string').join(', ');
                }

                return undefined;
            },
            set: (value) =>
            {
                style.fontFamily = value;
            },
        };
    }

    return null;
}

export function fontSizeMap(style: StyleRecord): PropertyMapping<number> | null
{
    const current = style.fontSize;

    if (typeof current === 'number')
    {
        return {
            key : 'style.fontSize',
            get : () =>
            {
                const value = style.fontSize;

                return typeof value === 'number' ? value : undefined;
            },
            set: (value) =>
            {
                style.fontSize = value;
            },
        };
    }

    if (typeof current === 'string')
    {
        const parsed = Number.parseFloat(current);

        if (!Number.isFinite(parsed))
        {
            return null;
        }

        return {
            key : 'style.fontSize',
            get : () =>
            {
                const value = style.fontSize;

                if (typeof value === 'number')
                {
                    return value;
                }

                if (typeof value === 'string')
                {
                    const next = Number.parseFloat(value);

                    return Number.isFinite(next) ? next : undefined;
                }

                return undefined;
            },
            set: (value) =>
            {
                style.fontSize = value;
            },
        };
    }

    return null;
}
