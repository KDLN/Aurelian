import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      ".turbo/**"
    ]
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // General rules
      "no-console": "off", // Allow console statements in development
      "no-debugger": "error", 
      "no-alert": "warn",
      "prefer-const": "warn", // Warning instead of error
      "no-var": "error",
      "react/no-unescaped-entities": "warn", // Warning instead of error
    },
  },
];