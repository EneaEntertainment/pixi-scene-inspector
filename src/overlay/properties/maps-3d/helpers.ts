import type { PropertyMapping } from '../map-helpers';

export type { PropertyMapping } from '../map-helpers';
export { directBoolean, directNumber, directString, takeMaps } from '../map-helpers';

export type AppendMapsContext = {
    allow: (key: string) => boolean;
    numbers: Array<PropertyMapping<number>>;
    booleans: Array<PropertyMapping<boolean>>;
    strings: Array<PropertyMapping<string>>;
};
