import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import globals from 'globals';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

// Translate the legacy eslintrc-style config (airbnb-base has no native flat
// config, so FlatCompat is required). Preserves the exact rule set from the
// previous .eslintrc.js after the eslint 8 -> 10 upgrade.
const legacyConfig = compat.config({
    root: true,
    env: {
        node: true,
        mocha: true,
        es2022: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
    },
    extends: [
        'eslint-config-airbnb-base',
    ],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        camelcase: 'off',
        'consistent-return': 'warn',
        'array-callback-return': 'error',
        indent: ['error', 4, {
            SwitchCase: 1,
            ObjectExpression: 1,
        }],
        'no-mixed-spaces-and-tabs': 'off',
        quotes: ['error', 'single', { allowTemplateLiterals: true }],
        semi: ['error', 'always'],
        'no-restricted-syntax': [
            'error',
            {
                selector: 'ForOfStatement',
                message: 'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.',
            },
            {
                selector: 'LabeledStatement',
                message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
            },
            {
                selector: 'WithStatement',
                message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
            },
        ],
        'guard-for-in': 'off',
        'max-len': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-unused-expressions': 'off',
        'import/no-dynamic-require': 'off',
        'no-param-reassign': 'off',
        'func-names': 'off',
        'no-undef': 'off',
    },
});

export default [
    // Replaces the old .eslintignore (node_modules is ignored by default).
    {
        ignores: [
            'cypress/results/**',
            'cypress/screenshots/**',
            'cypress/videos/**',
        ],
    },

    {
        files: ['**/*.js'],
        // The previous eslintrc setup did not report unused eslint-disable
        // directives; ESLint 9+ turns this on by default. Keep it off so this stays
        // a pure tooling upgrade.
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
        languageOptions: {
            globals: {
                ...globals.mocha,
                // Cypress runtime globals.
                cy: 'readonly',
                Cypress: 'readonly',
                expect: 'readonly',
                assert: 'readonly',
            },
        },
    },

    ...legacyConfig,

    // Preserve the legacy `overrides` block for test files.
    {
        files: ['**/*.test.js', '**/*.spec.js'],
        rules: {
            'no-underscore-dangle': 'off',
        },
    },

    // Baseline-preserving overrides after the eslint 8 -> 10, airbnb-base 14 -> 15
    // and eslint-plugin-import 2.x -> 2.32 upgrades. Kept behavior-equivalent to
    // the previous setup; none mask real bugs. See packages/server/eslint.config.mjs
    // for the rationale behind each.
    {
        rules: {
            'no-unused-vars': ['error', { caughtErrors: 'none' }],
            // eslint-plugin-import 2.32's import/order autofixer crashes on ESLint 9+.
            'import/order': 'off',
            'function-paren-newline': 'off',
            'function-call-argument-newline': 'off',
            'default-param-last': 'off',
            'no-promise-executor-return': 'off',
            'prefer-regex-literals': 'off',
        },
    },
];
