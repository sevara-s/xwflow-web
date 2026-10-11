import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { context as esbuildContext } from "esbuild";
import { defineConfig, type Plugin } from "vite";

const CDN = "https://xwui.dev/";
const LOCAL_BASE = "/xwflow-local-xwui";
const LOCAL_BUNDLE = resolve("node_modules/.xwflow-local-xwui/basic.js");
const LOCAL_BUNDLE_URL = "/xwflow-local-xwui-bundle";

/**
 * XWUI_LOCAL=<path to an xwui-lib checkout> runs the app against that
 * checkout instead of xwui.dev: the basic bundle resolves to its source and
 * the preset sheets to its built dist/styles. It exists to try XWUI
 * components before they are published; builds always use the CDN.
 */
function localXwui(root: string): Plugin {
  let port = 4173;
  const lib = resolve(root);
  const paths = (): Record<string, string> =>
    JSON.parse(readFileSync(resolve(lib, "xwui-lib-basic/src/generated/component-paths.generated.json"), "utf8"));
  return {
    name: "xwflow-local-xwui",
    apply: "serve",
    configResolved: (resolved) => {
      port = resolved.server.port ?? port;
    },
    config: () => ({
      resolve: {
        alias: [
          { find: /^@exonware\/xwui-lib-(common|style|basic)\/(.*)$/, replacement: `${lib}/xwui-lib-$1/src/$2` },
          { find: /^@exonware\/xwui-lib-(common|basic)$/, replacement: `${lib}/xwui-lib-$1/src/index.ts` },
        ],
      },
      server: { fs: { allow: [process.cwd(), lib] } },
    }),
    // Component sheets come from the checkout's source, so a change to an
    // existing XWUI component shows before it is published.
    // The basic tier is bundled into one module with esbuild and rebuilt when the
    // checkout changes: the browser then loads one file, not ~3,000 source
    // modules (first load measured 1.6 to 3.5 s that way). Component sheets are
    // still served by name below, so CSS imports are left out of the bundle.
    buildStart: async () => {
      const builder = await esbuildContext({
        entryPoints: [resolve(lib, "xwui-lib-basic/src/generated/index-basic.ts")],
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "es2022",
        outfile: LOCAL_BUNDLE,
        minify: true,
        sourcemap: "linked",
        loader: { ".css": "empty", ".json": "json", ".svg": "text" },
        alias: {
          "@exonware/xwui-lib-common": resolve(lib, "xwui-lib-common/src"),
          "@exonware/xwui-lib-style": resolve(lib, "xwui-lib-style/src"),
          "@exonware/xwui-lib-basic": resolve(lib, "xwui-lib-basic/src"),
        },
        logLevel: "warning",
      });
      await builder.rebuild();
      await builder.watch();
    },
    configureServer: (server) => {
      // The bundled tier is served as a plain file, outside Vite's module
      // pipeline (which re-processed all 11 MB of it on every load), with an
      // ETag so an unchanged bundle is a 304.
      server.middlewares.use(LOCAL_BUNDLE_URL, (request, response) => {
        const file = request.url?.startsWith("/basic.js.map") ? `${LOCAL_BUNDLE}.map` : LOCAL_BUNDLE;
        if (!existsSync(file)) {
          response.statusCode = 503;
          response.end("The local XWUI bundle is still building.");
          return;
        }
        const tag = `"${statSync(file).mtimeMs.toString(36)}"`;
        if (request.headers["if-none-match"] === tag) {
          response.statusCode = 304;
          response.end();
          return;
        }
        response.setHeader("Content-Type", file.endsWith(".map") ? "application/json" : "text/javascript");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("ETag", tag);
        response.end(readFileSync(file));
      });
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
    // An absolute URL, so Vite leaves the import to the browser and the file to the middleware above.
    transform: (code) => (code.includes(`${CDN}esm/basic.bundle.js`) ? code.replaceAll(`${CDN}esm/basic.bundle.js`, `http://localhost:${port}${LOCAL_BUNDLE_URL}/basic.js`) : undefined),
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
