// eslint.config.js
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // ── Ignorados ────────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      'functions/lib/**',
      'next-env.d.ts',
      '**/*.min.js',
    ],
  },

  // ── Base JS + TS ──────────────────────────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Reglas principales ────────────────────────────────────────────────────
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Next.js
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'off',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-require-imports': 'off',

      // General
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-useless-escape': 'warn',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },

  // ── Archivos Node / config / Firebase Admin ───────────────────────────────
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
      'no-undef': 'off',
    },
  },

  // ── Shadcn Command: atributos cmdk-* ─────────────────────────────────────
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
);