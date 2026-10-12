// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config'); // 1
const expoConfig = require('eslint-config-expo/flat'); // 2
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended'); // 3

module.exports = defineConfig([
  expoConfig, // 4
  eslintPluginPrettierRecommended, // 5
  {
    ignores: ['dist/*', 'app-example/*'], // 6
  },
]);
