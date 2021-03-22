module.exports = {
  parserOptions: {
    ecmaVersion: 2017
  },
  env: {
    "es6": true,
    "node": true,
  },
  plugins: [ "prettier" ],
  extends: [ "eslint:recommended", "prettier" ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        printWidth: 90,
        singleQuote: true,
        arrowParens: 'always',
        trailingComma: 'all',
      },
    ],
  },
}