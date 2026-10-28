import { findBooleanMap, findNumberMap, findStringMap } from './node';
import { findTextBooleanMap, findTextNumberMap, findTextStringMap } from './text';

import type { BooleanPropertyKey, NodePropertyMaps, NumberPropertyKey, StringPropertyKey } from './node';
import type { TextBooleanPropertyKey, TextNumberPropertyKey, TextPropertyMaps, TextStringPropertyKey } from './text';

export type FieldNumberKey = NumberPropertyKey | TextNumberPropertyKey;
export type FieldBooleanKey = BooleanPropertyKey | TextBooleanPropertyKey;
export type FieldStringKey = StringPropertyKey | TextStringPropertyKey;

export type PropertyMapsPair = {
    object: NodePropertyMaps;
    text: TextPropertyMaps;
};

export function isTextNumberKey(key: FieldNumberKey): key is TextNumberPropertyKey
{
    return key.startsWith('style.');
}

export function isTextBooleanKey(key: FieldBooleanKey): key is TextBooleanPropertyKey
{
    return key.startsWith('style.');
}

export function isTextStringKey(key: FieldStringKey): key is TextStringPropertyKey
{
    return key === 'text' || key.startsWith('style.');
}

export function resolveNumberMap(
    maps: PropertyMapsPair,
    key: FieldNumberKey,
): { get: () => number | undefined; set: (value: number) => void } | undefined
{
    if (isTextNumberKey(key))
    {
        return findTextNumberMap(maps.text, key);
    }

    return findNumberMap(maps.object, key);
}

export function resolveBooleanMap(
    maps: PropertyMapsPair,
    key: FieldBooleanKey,
): { get: () => boolean | undefined; set: (value: boolean) => void } | undefined
{
    if (isTextBooleanKey(key))
    {
        return findTextBooleanMap(maps.text, key);
    }

    return findBooleanMap(maps.object, key);
}

export function resolveStringMap(
    maps: PropertyMapsPair,
    key: FieldStringKey,
): { get: () => string | undefined; set: (value: string) => void } | undefined
{
    if (isTextStringKey(key))
    {
        return findTextStringMap(maps.text, key);
    }

    return findStringMap(maps.object, key);
}
