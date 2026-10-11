import { defineConfig } from "vite";

/**
 * XWUI comes from xwui.dev as published: the basic bundle is imported by URL
 * (src/xwui.ts) and the style parts are linked in index.html. Nothing here
 * swaps it for a local copy of the library.
 */
export default defineConfig({
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: "es2022", outDir: "dist" },
});
