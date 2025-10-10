// eslint.config.mjs
import js from '@eslint/js';
import next from 'eslint-config-next';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint 9 (Flat Config) para Next.js + TypeScript.
 * - Usa ESM (este archivo es .mjs)
 * - Incluye reglas type-aware de typescript-eslint (requiere tsconfig.json)
 */

export default [
  // Archivos/paths a ignorar
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'out/**',
      '**/*.min.js',
    ],
  },

  // Reglas base de JS
  js.configs.recommended,

  // Preset oficial de Next.js (incluye React, a11y, etc.)
  ...next,

  // Presets de TypeScript (type-aware)
  ...tseslint.configs.recommendedTypeChecked,

  // Config general para TS/JS en el proyecto
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Necesario para las reglas type-aware
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TS
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Afinado para Next app router
      '@next/next/no-document-import-in-page': 'off', // no aplica en /app
      '@next/next/no-img-element': 'off', // si usas <img> puntualmente
    },
  },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Archivos de configuración / scripts de Node
  {
    files: [
      'eslint.config.mjs',
      'next.config.{js,mjs,ts}',
      'postcss.config.{js,cjs,mjs,ts}',
      'tailwind.config.{js,cjs,mjs,ts}',
      'prettier.config.{js,cjs,mjs,ts}',
      'scripts/**',
      'src/app/**/middleware.{js,ts}',
      'src/app/**/route.{js,ts}',
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Opcional: avisar si hay comentarios /* eslint-disable */ sin uso
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
];
