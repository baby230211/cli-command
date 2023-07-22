/** @type {import('eslint').Linter.BaseConfig} **/
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'log-filenames', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'error',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off'
  },
  env: {
    node: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 'latest'
  }
};
