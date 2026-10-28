import type { SelectOption } from '../fields';

export const EVENT_MODE_OPTIONS: Array<SelectOption> = [
    { value: 'none', label: 'None' },
    { value: 'passive', label: 'Passive' },
    { value: 'auto', label: 'Auto' },
    { value: 'static', label: 'Static' },
    { value: 'dynamic', label: 'Dynamic' },
];

export const CURSOR_OPTIONS: Array<SelectOption> = [
    { value: 'auto', label: 'Auto' },
    { value: 'default', label: 'Default' },
    { value: 'none', label: 'None' },
    { value: 'context-menu', label: 'Context menu' },
    { value: 'help', label: 'Help' },
    { value: 'pointer', label: 'Pointer' },
    { value: 'progress', label: 'Progress' },
    { value: 'wait', label: 'Wait' },
    { value: 'cell', label: 'Cell' },
    { value: 'crosshair', label: 'Crosshair' },
    { value: 'text', label: 'Text' },
    { value: 'vertical-text', label: 'Vertical text' },
    { value: 'alias', label: 'Alias' },
    { value: 'copy', label: 'Copy' },
    { value: 'move', label: 'Move' },
    { value: 'no-drop', label: 'No drop' },
    { value: 'not-allowed', label: 'Not allowed' },
    { value: 'all-scroll', label: 'All scroll' },
    { value: 'zoom-in', label: 'Zoom in' },
    { value: 'zoom-out', label: 'Zoom out' },
    { value: 'grab', label: 'Grab' },
    { value: 'grabbing', label: 'Grabbing' },
];

export const BLEND_MODE_OPTIONS: Array<SelectOption> = [
    { value: 'inherit', label: 'Inherit' },
    { value: 'normal', label: 'Normal' },
    { value: 'add', label: 'Add' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'darken', label: 'Darken' },
    { value: 'lighten', label: 'Lighten' },
    { value: 'color-dodge', label: 'Color dodge' },
    { value: 'color-burn', label: 'Color burn' },
    { value: 'linear-burn', label: 'Linear burn' },
    { value: 'linear-dodge', label: 'Linear dodge' },
    { value: 'linear-light', label: 'Linear light' },
    { value: 'hard-light', label: 'Hard light' },
    { value: 'soft-light', label: 'Soft light' },
    { value: 'pin-light', label: 'Pin light' },
    { value: 'vivid-light', label: 'Vivid light' },
    { value: 'hard-mix', label: 'Hard mix' },
    { value: 'difference', label: 'Difference' },
    { value: 'exclusion', label: 'Exclusion' },
    { value: 'saturation', label: 'Saturation' },
    { value: 'color', label: 'Color' },
    { value: 'luminosity', label: 'Luminosity' },
    { value: 'erase', label: 'Erase' },
    { value: 'none', label: 'None' },
    { value: 'subtract', label: 'Subtract' },
    { value: 'divide', label: 'Divide' },
    { value: 'negation', label: 'Negation' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'normal-npm', label: 'Normal NPM' },
    { value: 'add-npm', label: 'Add NPM' },
    { value: 'screen-npm', label: 'Screen NPM' },
];

export const FONT_WEIGHT_OPTIONS: Array<SelectOption> = [
    { value: 'normal', label: 'normal' },
    { value: 'bold', label: 'bold' },
    { value: 'bolder', label: 'bolder' },
    { value: 'lighter', label: 'lighter' },
    { value: '100', label: '100' },
    { value: '200', label: '200' },
    { value: '300', label: '300' },
    { value: '400', label: '400' },
    { value: '500', label: '500' },
    { value: '600', label: '600' },
    { value: '700', label: '700' },
    { value: '800', label: '800' },
    { value: '900', label: '900' },
];

export const FONT_STYLE_OPTIONS: Array<SelectOption> = [
    { value: 'normal', label: 'normal' },
    { value: 'italic', label: 'italic' },
    { value: 'oblique', label: 'oblique' },
];

export const FONT_VARIANT_OPTIONS: Array<SelectOption> = [
    { value: 'normal', label: 'normal' },
    { value: 'small-caps', label: 'small-caps' },
];

export const ALIGN_OPTIONS: Array<SelectOption> = [
    { value: 'left', label: 'left' },
    { value: 'center', label: 'center' },
    { value: 'right', label: 'right' },
    { value: 'justify', label: 'justify' },
];

export const WHITE_SPACE_OPTIONS: Array<SelectOption> = [
    { value: 'normal', label: 'normal' },
    { value: 'pre', label: 'pre' },
    { value: 'pre-line', label: 'pre-line' },
];

export const TEXT_BASELINE_OPTIONS: Array<SelectOption> = [
    { value: 'alphabetic', label: 'alphabetic' },
    { value: 'top', label: 'top' },
    { value: 'hanging', label: 'hanging' },
    { value: 'middle', label: 'middle' },
    { value: 'ideographic', label: 'ideographic' },
    { value: 'bottom', label: 'bottom' },
];

export const STROKE_JOIN_OPTIONS: Array<SelectOption> = [
    { value: 'miter', label: 'miter' },
    { value: 'round', label: 'round' },
    { value: 'bevel', label: 'bevel' },
];
