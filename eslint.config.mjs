import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "coverage/**/*",
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
      ".husky/**/*",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];

export default config;