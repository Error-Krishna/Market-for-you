import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.venv/**",
      "**/uploads/**",
      "**/coverage/**",
      "market-aura-4u-frontend-main/**",
      "CAPSTONE/**",
    ],
  },
  {
    files: ["market-aura-4u-backend-main/src/**/*.js", "market-aura-4u-backend-main/tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "preserve-caught-error": "off",
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
