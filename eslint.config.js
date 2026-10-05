import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const DOM_GLOBALS = [
  'window',
  'document',
  'navigator',
  'performance',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'AudioContext',
  'Date',
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // KTD2: the simulation is pure and deterministic. No rendering, DOM, or wall-clock access.
    files: ['src/sim/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'three', message: 'src/sim must not import three (KTD2).' },
            { name: 'lil-gui', message: 'src/sim must not import lil-gui (KTD2).' },
          ],
          patterns: [
            {
              group: ['**/render/**', '**/ui/**', '**/input/**', '**/audio/**', '**/debug/**', '**/modes/**'],
              message: 'src/sim must not depend on presentation layers (KTD2).',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...DOM_GLOBALS],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng from src/sim/rng.ts (KTD2).' },
        { object: 'Date', property: 'now', message: 'Use sim time, not wall-clock time (KTD2).' },
      ],
    },
  },
);
