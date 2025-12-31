import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['**/dist/**', '**/node_modules/**'],
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname
    }
  },
  rules: {
    'no-console': 'off',
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
    'prefer-const': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn'
  }
});
