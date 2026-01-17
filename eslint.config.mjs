import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/dist/**', '**/node_modules/**'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // === Code Quality (Warnings for gradual adoption) ===
      eqeqeq: ['warn', 'always'],
      curly: ['warn', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'warn',

      // === TypeScript Best Practices ===
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',

      // === Complexity Limits (Helps keep AI-generated code maintainable) ===
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', { max: 15 }],

      // === Relaxed Rules ===
      'no-console': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn'
    }
  },
  {
    // Relaxed rules for test files
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    // Relaxed rules for Supabase Edge Functions and scripts
    files: ['supabase/functions/**/*.ts', 'scripts/**/*.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
);
