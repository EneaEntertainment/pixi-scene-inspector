import type { FieldBooleanKey, FieldNumberKey, FieldStringKey } from '../properties/keys';
import type { FillColorStop, TextFillPropertyKey } from '../properties/text';

export type SelectOption = {
    value: string;
    label: string;
};

export type NumberFieldSpec = {
    key: FieldNumberKey;
    label: string;
    step: number;
    dragAccel?: number;
    min?: number;
    max?: number;
};

export type BooleanFieldSpec = {
    key: FieldBooleanKey;
    label: string;
};

export type SelectFieldSpec = {
    key: FieldStringKey;
    label: string;
    options: Array<SelectOption>;
    allowEmpty?: boolean;
};

export type TextFieldSpec = {
    key: FieldStringKey;
    label: string;
};

export type ColorFieldSpec = {
    key: FieldStringKey;
    label: string;
};

export type FillStopsFieldSpec = {
    key: TextFillPropertyKey;
    label: string;
};

export type NumberField = {
    key: FieldNumberKey;
    root: HTMLElement;

    setDisplay: (value: number | undefined) => void;
    isBusy: () => boolean;
    destroy: () => void;
};

export type BooleanField = {
    key: FieldBooleanKey;
    root: HTMLElement;

    setDisplay: (value: boolean | undefined) => void;
    isBusy: () => boolean;
    destroy: () => void;
};

export type SelectField = {
    key: FieldStringKey;
    root: HTMLElement;

    setDisplay: (value: string | undefined) => void;
    isBusy: () => boolean;
    destroy: () => void;
};

export type TextField = {
    key: FieldStringKey;
    root: HTMLElement;

    setDisplay: (value: string | undefined) => void;
    isBusy: () => boolean;
    destroy: () => void;
};

export type ColorField = {
    key: FieldStringKey;
    root: HTMLElement;

    setDisplay: (value: string | undefined) => void;
    isBusy: () => boolean;
    destroy: () => void;
};

export type FillStopsField = {
    key: TextFillPropertyKey;
    root: HTMLElement;

    setDisplay: (value: Array<FillColorStop> | undefined) => void;
    isBusy: () => boolean;
    destroy: () => void;
};
