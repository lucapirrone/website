import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /* link interni come <a>: ogni pagina monta la città da zero */
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/city/engine.js",
    ".pair/**",
    ".claude/**",
    ".cursor/**",
    ".windsurf/**",
    ".agent/**",
    ".agents/**",
  ]),
]);

export default eslintConfig;
