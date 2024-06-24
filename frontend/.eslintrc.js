module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    "plugin:@typescript-eslint/recommended",
    "next/core-web-vitals", // extended set of recommended rules from Next.js
    "prettier",
  ],
  plugins: ["simple-import-sort", "@typescript-eslint"],
  root: true,
  rules: {
    "simple-import-sort/imports": "warn",
    "@typescript-eslint/no-explicit-any": "off", // TODO: remove once refactor from JS is complete
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-unused-vars": ['warn', { argsIgnorePattern: "^_", "varsIgnorePattern": "^_" }],
    '@typescript-eslint/no-empty-function': ['warn', { allow: ['methods'] }],
  }
};
