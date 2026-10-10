import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const CDN = "https://xwui.dev/";
const LOCAL_BASIC = "xwflow-local-xwui/basic";
const LOCAL_BASE = "/xwflow-local-xwui";

/**
 * XWUI_LOCAL=<path to an xwui-lib checkout> runs the app against that
 * checkout instead of xwui.dev: the basic bundle resolves to its source and
 * the preset sheets to its built dist/styles. It exists to try XWUI
 * components before they are published; builds always use the CDN.
 */
function localXwui(root: string): Plugin {
  const lib = resolve(root);
  const paths = (): Record<string, string> =>
    JSON.parse(readFileSync(resolve(lib, "xwui-lib-basic/src/generated/component-paths.generated.json"), "utf8"));
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
    // Component sheets come from the checkout's source, so a change to an
    // existing XWUI component shows before it is published.
    configureServer: (server) => {
      server.middlewares.use(LOCAL_BASE, (request, response) => {
        const url = request.url ?? "/";
        // Components ask by tier path (sometimes a legacy one); the sheet is
        // found by component name, as the package's component map places it.
        const name = /^\/styles\/components\/.*\/(XWUI[A-Za-z0-9]+)\.css$/.exec(url.split("?")[0])?.[1];
        const folder = name ? paths()[name] : undefined;
        const file = folder ? resolve(lib, "xwui-lib-basic/src", folder, `${name}.css`) : "";
        if (file && existsSync(file)) {
          response.setHeader("Content-Type", "text/css");
          response.end(readFileSync(file));
          return;
        }
        // Style assets (brand logos) the checkout ships in its style source.
        const asset = /^\/styles\/((?:brand)\/[A-Za-z0-9/_.-]+\.svg)$/.exec(url.split("?")[0])?.[1];
        const assetFile = asset ? resolve(lib, "xwui-lib-style/src", asset) : "";
        if (assetFile && existsSync(assetFile)) {
          response.setHeader("Content-Type", "image/svg+xml");
          response.end(readFileSync(assetFile));
          return;
        }
        // Everything else under the asset base (icons, fonts, sheets of
        // components the checkout lacks) is the published asset.
        response.statusCode = 302;
        response.setHeader("Location", `${CDN}${url.replace(/^\//, "")}`);
        response.end();
      });
    },
    // Vite leaves https:// imports alone (aliases included), so the CDN
    // specifier is renamed to one the alias above resolves.
    transform: (code) => (code.includes(`${CDN}esm/basic.bundle.js`) ? code.replaceAll(`${CDN}esm/basic.bundle.js`, LOCAL_BASIC) : undefined),
    // Presets come from the checkout's build; component sheets from its source
    // (served above under the asset base the components load from).
    transformIndexHtml: (html) =>
      html
        .replaceAll(`${CDN}styles/`, `/@fs${lib}/dist/styles/`)
        .replace("<head>", `<head>\n    <script>window.__XWUI_TESTERS_ASSET_BASE__ = "${LOCAL_BASE}/";</script>`),
  };
}

export default defineConfig({
  plugins: process.env.XWUI_LOCAL ? [localXwui(process.env.XWUI_LOCAL)] : [],
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: "es2022", outDir: "dist" },
});
