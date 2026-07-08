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

// Translate the legacy eslintrc-style config (airbnb-base has no native flat
// config, so FlatCompat is required).
const legacyConfig = compat.config({
    env: {
      node: true,
      es2022: true,
    },
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: ['import-alias', 'vuejs-accessibility'],
    extends: [
      'plugin:vue/recommended',
      'airbnb-base',
      'plugin:import/recommended',
      'plugin:vuejs-accessibility/recommended',
    ],
    settings: {
      'import/resolver': {
        'custom-alias': {
          alias: {
            '@': path.resolve(__dirname, 'src'),
          },
          extensions: ['.js', '.vue'],
        },
      },
    },
    rules: {
      // TODO: enable these lint rules over time
      'max-len': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'func-names': 'off',

      // Modern browsers have much greater support for ES6+ features than they
      // did when our version of eslint-config-airbnb was written.
      // TODO: consider upgrading eslint-config-airbnb
      'no-restricted-syntax': 'off',

      'no-param-reassign': ['error', {
        props: true,
        ignorePropertyModificationsFor: [
          'state', // for vuex/pinia state
        ],
      }],

      'import/prefer-default-export': 'off',
      'import/no-commonjs': 'error',
      'import-alias/import-alias': [
        'error',
        {
          aliases: [
            { alias: '@', matcher: '^@/' },
          ],
        },
      ],
    },
});

export default [
  // Honor .gitignore (replaces the old `--ignore-path .gitignore` flag).
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),

  // Lint .vue files in addition to the flat-config defaults (js/mjs/cjs).
  {
    files: ['**/*.js', '**/*.vue'],
  },

  ...legacyConfig,

  // Baseline-preserving overrides after the eslint 8 -> 10 / eslint-plugin-vue
  // 9 -> 10 upgrade. These keep the flat config behavior-equivalent to the
  // previous eslintrc setup; none of them mask real bugs.
  {
    rules: {
      // eslint-plugin-vue v10 switched `recommended` to Vue 3 rules, which flag
      // Vue 2 template syntax as deprecated. This app deliberately runs the
      // `@vue/compat` migration build (see vite.config.js), so that syntax is
      // still valid at runtime. Re-enable these once the compat build is dropped
      // as part of a dedicated Vue 3 migration.
      'vue/no-deprecated-v-bind-sync': 'off',
      'vue/no-deprecated-destroyed-lifecycle': 'off',
      'vue/no-deprecated-router-link-tag-prop': 'off',
      'vue/no-deprecated-v-on-native-modifier': 'off',

      // ESLint 9+ changed the `no-unused-vars` default for caught errors from
      // 'none' to 'all', newly flagging unused `catch (e)` bindings. Restore the
      // previous behavior to keep this a pure dependency upgrade.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
];
