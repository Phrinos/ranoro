// eslint.config.js
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  // Ignorar build, cache y auto-generados
  { ignores: ['node_modules/', '.next/', 'dist/', 'build/', 'functions/lib/**', 'next-env.d.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactJsxRuntime,

  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react, 'react-hooks': reactHooks, '@next/next': nextPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      // Next
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // React moderno
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',

      // Hooks
      'react-hooks/rules-of-hooks': 'error',   // mantenemos como error (mejor arreglar el código)
      'react-hooks/exhaustive-deps': 'warn',

      // TS
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',             // <- para que no truene por @ts-ignore
      '@typescript-eslint/triple-slash-reference': 'off',     // <- para next-env.d.ts & *.d.ts

      // Otros
      'no-case-declarations': 'warn', // <- quita el error en switch/case
      'no-empty': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-useless-escape': 'warn',
    },
  },

  // Archivos Node/config y Firebase Admin
  {
    files: [
      '**/next.config.*',
      '**/postcss.config.*',
      '**/tailwind.config.*',
      '**/eslint.config.*',
      '**/prettier.config.*',
      'scripts/**/*.{js,ts}',
      'src/functions/**/*.{js,ts}',
      'src/lib/firebaseAdmin.{js,ts}',
    ],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'script',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },

  // Shadcn Command: permitir atributos cmdk-*
  {
    files: ['src/components/ui/command.tsx'],
    rules: {
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'cmdk-input',
            'cmdk-list',
            'cmdk-item',
            'cmdk-dialog',
            'cmdk-overlay',
            'cmdk-input-wrapper',
          ],
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
