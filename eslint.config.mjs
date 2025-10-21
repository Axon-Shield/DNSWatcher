import { type Config } from "eslint";
import baseConfig from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [nextPlugin.configs.recommended],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
) satisfies Config;