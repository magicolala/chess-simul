import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/assets/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname
    }
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
    'prefer-const': 'error',
    'eqeqeq': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
});
