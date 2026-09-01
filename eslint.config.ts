import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

type ProjectLayer =
  | 'app'
  | 'application'
  | 'domain'
  | 'infrastructure'
  | 'presentation'
  | 'simulation'
  | 'ui';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches a layer segment in a project-relative path or a conventional source
 * alias, while leaving bare package names to the package resolver.
 */
const layerImportPattern = (layers: readonly ProjectLayer[]): string => {
  const names = layers.map(escapeRegExp).join('|');

  return String.raw`^(?:(?:(?:\.\.?/)+|(?:@|~|#)/|src/)(?:[^/]+/)*(?:${names})(?:/|$)|(?:@|~|#)(?:${names})(?:/|$))`;
};

const boundaryConfig = (layer: ProjectLayer, forbiddenLayers: readonly ProjectLayer[]) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: layerImportPattern(forbiddenLayers),
            message: `La couche ${layer} ne peut pas importer : ${forbiddenLayers.join(', ')}.`,
          },
        ],
      },
    ],
  },
});

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
      'pnpm-lock.yaml',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      // The plugin publishes no type declaration for its flat-config shape.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'import-x/resolver-next': [importX.createNodeResolver()],
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'import-x/first': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-cycle': ['error', { maxDepth: '∞' }],
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-refresh/only-export-components': 'error',
    },
  },
  boundaryConfig('domain', [
    'app',
    'application',
    'infrastructure',
    'presentation',
    'simulation',
    'ui',
  ]),
  boundaryConfig('application', ['app', 'infrastructure', 'presentation', 'simulation', 'ui']),
  boundaryConfig('simulation', ['app', 'application', 'infrastructure', 'presentation', 'ui']),
  boundaryConfig('infrastructure', ['app', 'presentation', 'simulation', 'ui']),
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'import-x/no-cycle': 'off',
    },
  },
);
