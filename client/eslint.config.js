import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js'
import prettierConfig from 'eslint-config-prettier'

export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...pluginReactConfig,
    rules: {
      ...pluginReactConfig.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
  prettierConfig,
]
