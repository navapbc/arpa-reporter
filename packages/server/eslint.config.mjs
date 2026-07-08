import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import globals from 'globals';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// uuid v14 is an "exports"-only package with no `main`, which the
// eslint-plugin-import node resolver cannot follow (it resolves fine at
// runtime). Treat it as always-resolvable to avoid false import/no-unresolved
// errors.
const importSettings = {
  settings: {
    'import/core-modules': ['uuid'],
  },
};

// Translate the legacy eslintrc-style config (airbnb-base has no native flat
// config, so FlatCompat is required). This preserves the exact rule set from
// the previous .eslintrc.js after the eslint 7 -> 10 upgrade.
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
    },
});

export default [
  // Honor .gitignore (replaces the old `.eslintignore` / node_modules default).
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),

  {
    files: ['**/*.js'],
    // The previous eslintrc setup did not report unused eslint-disable
    // directives; ESLint 9+ turns this on by default. Keep it off so this stays
    // a pure tooling upgrade rather than a sweep of stale disable comments.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    ...importSettings,
  },

  ...legacyConfig,

  // Preserve the legacy `overrides` block for test files.
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        requireSrc: 'readonly',
      },
    },
    rules: {
      'no-underscore-dangle': 'off',
    },
  },

  // Baseline-preserving overrides after the eslint 7 -> 10, airbnb-base 14 -> 15
  // and eslint-plugin-import 2.21 -> 2.32 upgrades. These keep the ruleset
  // behavior-equivalent to the previous setup so this remains a tooling-only
  // change; none of them mask real bugs. Tighten in a dedicated follow-up.
  {
    ...importSettings,
    rules: {
      // ESLint 9+ changed the `no-unused-vars` default for caught errors from
      // 'none' to 'all', newly flagging unused `catch (e)` bindings.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],

      // eslint-plugin-import 2.32's `import/order` autofixer calls
      // `sourceCode.getTokenOrCommentBefore`, removed in ESLint 9+, and crashes.
      // TODO: re-enable once on an ESLint 10-compatible import plugin
      // (e.g. eslint-plugin-import-x).
      'import/order': 'off',

      // Formatting rules newly enforced by airbnb-base 15 that the existing
      // code predates. TODO: adopt via a separate `--fix` formatting pass.
      'function-paren-newline': 'off',
      'function-call-argument-newline': 'off',

      // Rules newly enforced by airbnb-base 15. Enabling these requires code
      // changes (param reordering / regex rewrites), out of scope for a tooling
      // upgrade. TODO: address and re-enable in a follow-up.
      'default-param-last': 'off',
      'no-promise-executor-return': 'off',
      'prefer-regex-literals': 'off',
    },
  },
];
