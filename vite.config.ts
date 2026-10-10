import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const CDN = "https://xwui.dev/";
const LOCAL_BASIC = "xwflow-local-xwui/basic";

/**
 * XWUI_LOCAL=<path to an xwui-lib checkout> runs the app against that
 * checkout instead of xwui.dev: the basic bundle resolves to its source and
 * the preset sheets to its built dist/styles. It exists to try XWUI
 * components before they are published; builds always use the CDN.
 */
function localXwui(root: string): Plugin {
  const lib = resolve(root);
  return {
    name: "xwflow-local-xwui",
    apply: "serve",
    config: () => ({
      resolve: {
        alias: [
          { find: LOCAL_BASIC, replacement: resolve(lib, "xwui-lib-basic/src/generated/index-basic.ts") },
          { find: /^@exonware\/xwui-lib-(common|style|basic)\/(.*)$/, replacement: `${lib}/xwui-lib-$1/src/$2` },
          { find: /^@exonware\/xwui-lib-(common|basic)$/, replacement: `${lib}/xwui-lib-$1/src/index.ts` },
        ],
      },
      server: { fs: { allow: [process.cwd(), lib] } },
    }),
    // Vite leaves https:// imports alone (aliases included), so the CDN
    // specifier is renamed to one the alias above resolves.
    transform: (code) => (code.includes(`${CDN}esm/basic.bundle.js`) ? code.replaceAll(`${CDN}esm/basic.bundle.js`, LOCAL_BASIC) : undefined),
    // Presets come from the checkout's build; the sheets of already-published
    // components still come from the CDN (new ones import their own CSS).
    transformIndexHtml: (html) =>
      html
        .replaceAll(`${CDN}styles/`, `/@fs${lib}/dist/styles/`)
        .replace("<head>", `<head>\n    <script>window.__XWUI_TESTERS_ASSET_BASE__ = "${CDN}";</script>`),
  };
}

export default defineConfig({
  plugins: process.env.XWUI_LOCAL ? [localXwui(process.env.XWUI_LOCAL)] : [],
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: "es2022", outDir: "dist" },
});
