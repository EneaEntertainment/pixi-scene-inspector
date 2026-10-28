import jsdoc from 'eslint-plugin-jsdoc';
import noMixed from 'eslint-plugin-no-mixed-operators';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import config from '@pixi/eslint-config';

export default tseslint.config(
    ...config,
    ...svelte.configs['flat/recommended'],
    {
        ignores: ['build', 'dist', 'node_modules'],
    },
    {
        files: ['**/*'],
        plugins: {
            jsdoc,
            'no-mixed-operators': noMixed,
        },
        settings: {
            jsdoc: {
                tagNamePreference: {
                    method: 'method',
                    function: 'function',
                    extends: 'extends',
                    typeParam: 'typeParam',
                    api: 'api',
                },
            },
        },
        rules: {
            'no-mixed-operators': 'off',
            'no-mixed-operators/no-mixed-operators': 1,
            'constructor-super': 'off',
            'no-new': 'off',
            curly: ['error', 'all'],
            'brace-style': ['error', 'allman'],
            'comma-dangle': ['error', 'always-multiline'],
            'no-unmodified-loop-condition': 'off',
            'jsdoc/multiline-blocks': [1, { noMultilineBlocks: true, minimumLengthForMultiline: 115 }],
            'jsdoc/check-access': 1,
            'jsdoc/check-alignment': 1,
            'jsdoc/check-param-names': 1,
            'jsdoc/check-property-names': 1,
            'jsdoc/check-tag-names': 1,
            'jsdoc/check-types': 1,
            'jsdoc/check-values': 1,
            'jsdoc/empty-tags': 1,
            'jsdoc/implements-on-classes': 1,
            'jsdoc/tag-lines': 1,
            'jsdoc/no-multi-asterisks': [1, { allowWhitespace: true }],
            'jsdoc/require-param': 1,
            'jsdoc/require-param-description': 0,
            'jsdoc/require-param-name': 1,
            'jsdoc/require-property': 1,
            'jsdoc/require-property-description': 1,
            'jsdoc/require-property-name': 1,
            'jsdoc/require-property-type': 1,
            'jsdoc/require-returns-description': 1,
            'jsdoc/require-hyphen-before-param-description': 1,
            'jsdoc/valid-types': 1,
        },
    },
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        rules: {
            '@typescript-eslint/triple-slash-reference': [1, { path: 'always' }],
            '@typescript-eslint/prefer-readonly': 'error',
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                {
                    accessibility: 'explicit',
                    overrides: {
                        accessors: 'off',
                        constructors: 'no-public',
                        methods: 'explicit',
                        properties: 'explicit',
                        parameterProperties: 'explicit',
                    },
                },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'memberLike',
                    modifiers: ['private'],
                    format: ['camelCase'],
                    leadingUnderscore: 'require',
                },
            ],
            '@typescript-eslint/no-unsafe-declaration-merging': 0,
            '@typescript-eslint/no-duplicate-enum-values': 0,
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/consistent-type-imports': ['warn', {
                disallowTypeAnnotations: false,
                fixStyle: 'separate-type-imports',
                prefer: 'type-imports',
            }],
            'key-spacing': ['error', {
                multiLine: {
                    beforeColon: false,
                    afterColon: true,
                },
                align: {
                    beforeColon: true,
                    afterColon: true,
                    on: 'colon',
                },
            }],
            '@typescript-eslint/array-type': [
                'warn',
                {
                    default: 'generic',
                },
            ],
        },
    },
    {
        files: ['**/*.svelte'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
        },
        rules: {
            '@typescript-eslint/explicit-member-accessibility': 'off',
            '@typescript-eslint/prefer-readonly': 'off',
            '@typescript-eslint/naming-convention': 'off',
        },
    },
);
