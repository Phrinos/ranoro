
// functions/eslint.config.js

const eslintPluginTypescript = require("@typescript-eslint/parser");
const eslintPluginImport = require("eslint-plugin-import");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["lib/"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: eslintPluginTypescript,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      ...eslintPluginImport.configs.recommended.rules,
      "import/no-unresolved": "off",
    },
  },
  eslintConfigPrettier,
];
