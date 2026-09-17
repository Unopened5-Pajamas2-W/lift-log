import { defineConfig } from "vite";

/** Static local-first PWA build. No runtime deps; SW is hand-rolled (see sw.js). */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
    cssCodeSplit: false,
    sourcemap: false,
    reportCompressedSize: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.1.0"),
  },
});
