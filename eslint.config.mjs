import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import sort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import styleOrder from './scripts/eslint/style-order.mjs';

const sourceFiles = ['packages/*/src/**/*.{ts,tsx}'];
const reactFiles = ['packages/{react-native,web}/**/*.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: ['**/lib/**', '**/coverage/**', '**/node_modules/**', '**/dist/**'],
  },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.jest },
    },
    plugins: { 'import-x': importX, 'simple-import-sort': sort },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-nested-ternary': 'error',
      'no-else-return': 'error',
      'object-shorthand': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-shadow': 'error',
    },
  },
  {
    files: sourceFiles,
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: reactFiles,
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat['jsx-runtime'].rules,
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['packages/{react-native,web}/src/**/*.tsx'],
    plugins: { talkentry: { rules: { 'styles-after-component': styleOrder } } },
    rules: { 'talkentry/styles-after-component': 'error' },
  },
  {
    files: ['packages/web/src/**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react/*',
            'react-native',
            'react-native-*',
            '@shopify/*',
            'socket.io-client',
            '@talkentry/web',
            '@talkentry/react-native',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react-native',
            'react-native-*',
            '@shopify/*',
            '@talkentry/react-native',
            '@talkentry/react-native/*',
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}', '**/tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
  { rules: { curly: ['error', 'all'] } },
);
