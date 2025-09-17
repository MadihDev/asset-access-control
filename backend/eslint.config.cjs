// ESLint flat config for backend (CommonJS for Node CJS projects)
// Using flat config with ESLint v9
const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const prettier = require('eslint-config-prettier')
const globals = require('globals')

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', '__tests__/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      // Use module so TS import/export syntax is parsed correctly
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: false,
      },
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  prettier,
]
