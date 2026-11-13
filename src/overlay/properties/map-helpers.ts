import type { BooleanPropertyKey, NumberPropertyKey, PropertyKey, StringPropertyKey } from './property-keys';

export type PropertyMapping<T> = {
    key: PropertyKey;
    get: () => T | undefined;
    set: (value: T) => void;
};

export function takeMaps<T>(
    allow: (key: string) => boolean,
    maps: Array<PropertyMapping<T>>,
): Array<PropertyMapping<T>>
{
    return maps.filter((entry) => allow(entry.key));
}

export function directNumber(
    key: NumberPropertyKey,
    get: () => number | undefined,
    set: (value: number) => void,
): Array<PropertyMapping<number>>
{
    if (typeof get() !== 'number')
    {
        return [];
    }

    return [{ key, get, set }];
}

export function directBoolean(
    key: BooleanPropertyKey,
    get: () => boolean | undefined,
    set: (value: boolean) => void,
): Array<PropertyMapping<boolean>>
{
    if (typeof get() !== 'boolean')
    {
        return [];
    }

    return [{ key, get, set }];
}

export function directString(
    key: StringPropertyKey,
    get: () => string | undefined,
    set: (value: string) => void,
): Array<PropertyMapping<string>>
{
    if (typeof get() !== 'string')
    {
        return [];
    }

    return [{ key, get, set }];
}
