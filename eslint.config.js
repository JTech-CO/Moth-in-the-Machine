import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrictedPatterns = (groups) => [
  'error',
  {
    patterns: groups,
  },
];

export default tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedPatterns([
        {
          group: ['@/store', '@/store/**', '../store/**', '../../store/**', '../../../store/**'],
          message: 'UI must read application state through hooks instead of importing the store.',
        },
      ]),
    },
  },
  {
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedPatterns([
        {
          group: [
            '@/components/**',
            '@/pages/**',
            '../components/**',
            '../../components/**',
            '../pages/**',
            '../../pages/**',
          ],
          message: 'The store is a lower-level module and cannot depend on UI modules.',
        },
      ]),
    },
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedPatterns([
        {
          group: [
            '@/components/**',
            '@/pages/**',
            '../components/**',
            '../../components/**',
            '../pages/**',
            '../../pages/**',
          ],
          message: 'Hooks may compose state and utilities, but cannot depend on UI modules.',
        },
      ]),
    },
  },
  {
    files: ['src/utils/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedPatterns([
        {
          group: [
            'react',
            'react-dom',
            '@/components/**',
            '@/hooks/**',
            '@/pages/**',
            '@/store/**',
            '../components/**',
            '../../components/**',
            '../hooks/**',
            '../../hooks/**',
            '../pages/**',
            '../../pages/**',
            '../store/**',
            '../../store/**',
          ],
          message: 'Utilities must remain deterministic and independent from React, state, and UI.',
        },
      ]),
    },
  },
  prettier,
);
