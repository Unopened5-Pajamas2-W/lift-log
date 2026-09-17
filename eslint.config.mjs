import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Flat config: no `any` in new code, no unused vars. */
export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "copilot_temp/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
