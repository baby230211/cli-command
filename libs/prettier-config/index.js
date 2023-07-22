/** @type {import('prettier').Config} **/
module.exports = {
  arrowParens: 'avoid',
  singleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true,
  semi: true,
  overrides: [
      {
          files: ['*.scss', '*.css', '*.json', '*.yaml', '*.yml', '*.html', '*.md'],
          options: {
              tabWidth: 2
          }
      }
  ]
};
