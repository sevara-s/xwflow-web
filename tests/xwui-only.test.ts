import { describe, expect, it } from "vitest";

/**
 * The assessment rule: pages and shells build the UI only from XWUI
 * components (composer nodes) loaded from xwui.dev, never from hand-written
 * DOM, HTML or CSS. Anything XWUI basic lacks is an XWFlow component in
 * src/components, built on the published XWUIComponent. This test reads every
 * page, shell, the node kit and the components, and fails on any construct
 * that would break the rule.
 */
const sources = import.meta.glob(["../src/pages/**/*.ts", "../src/app/shells/*.ts", "../src/ui/*.ts", "../src/app/app.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const styles = import.meta.glob(["../src/pages/**/*.css", "../src/app/**/*.css", "../src/ui/**/*.css"], { query: "?raw", import: "default", eager: true });
const components = import.meta.glob("../src/components/**/*", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const forbidden: Array<[string, RegExp]> = [
  ["document.createElement", /document\.createElement/],
  ["innerHTML / outerHTML", /\.(inner|outer)HTML\b/],
  ["appending DOM nodes", /\.(append|appendChild|prepend|insertBefore|replaceChildren)\(/],
  ["inline style writes", /\.style\.|\.setProperty\(/],
  ["class list edits", /\.classList\b|\.className\s*=/],
  ["constructing XWUI classes by hand", /new XWUI[A-Z]/],
  ["the removed app components", /components\/XWFlow/],
  ["app CSS imports", /import\s+["'][^"']+\.css["']/],
  // Colours and type come from the xwflow brand's tokens, never literals in app code.
  ["colour literals (hex or rgba)", /["'`][^"'`]*(#[0-9a-fA-F]{3,8}\b|rgba?\()[^"'`]*["'`]/],
  ["type size literals (clamp, rem, em)", /["'`]\s*(clamp\(|-?[0-9.]+r?em\s*["'`])/],
  // Gaps and paddings are steps of the brand's spacing scale (space(), inset(), "m", "xl"...).
  // (A numeric gap is refused by the kit's types; the marquee and the canvas insets take pixel numbers.)
  // Decorations are named presets from ui/decor.ts; their geometry lives only there.
  ["decoration geometry (shape() or px/% offsets)", /\bshape\(|\b(top|left|right|bottom)\s*:\s*["'`]-?[\d.]+(px|%)/],
  ["spacing literals (px gaps, paddings, margins)", /\b(gap|padding|margin|rowGap|columnGap)\s*:\s*["'`][^"'`]*\d|\b(padding|margin)\s*:\s*\d/],
  // Grid widths, column splits, page widths and breakpoints are named presets from ui/layout.ts.
  ["layout literals (grid widths, column templates, max widths, media queries)", /\bgrid\([^;]*,\s*\d+\s*[,)]|\bcolumns\s*:\s*["'`]|\bmaxWidth\s*:\s*\d|matchMedia\(\s*["'`]|\bmeasure\([^;]*,\s*\d+\s*\)/],
];

describe("XWUI composition only", () => {
  it("finds the pages and shells", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(25);
  });

  it.each(Object.keys(sources).map((path) => [path]))("%s builds UI from XWUI nodes only", (path: string) => {
    const code = sources[path]
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      // The one allowed construction: app.ts mounts the root XWUIComposer that holds every page.
      .filter((line) => !(path.endsWith("/app/app.ts") && /new XWUIComposer\(root, /.test(line)))
      .join("\n");
    for (const [what, pattern] of forbidden) {
      // The kit draws a decoration from the table in ui/decor.ts, the one place its geometry may be.
      if (/\/ui\/(kit|decor)\.ts$/.test(path) && what.startsWith("decoration")) continue;
      expect(code, `${path} uses ${what}`).not.toMatch(pattern);
    }
  });

  it("every routed page exports a view()", () => {
    const pages = Object.entries(sources).filter(([path]) => /\/pages\/(site|studio|admin)\/[a-z-]+\.ts$|\/pages\/views\/view\.ts$/.test(path) && !/\/(common|common-view|console-view|editor-inspector|editor-panels|health-panels|landing-hero|landing-sections)\.ts$/.test(path));
    expect(pages.length).toBeGreaterThan(25);
    for (const [path, code] of pages) expect(code, path).toMatch(/export (async )?function view\(/);
  });

  it("keeps no page stylesheets", () => {
    expect(Object.keys(styles)).toEqual([]);
  });

  it("builds each XWFlow component like an XWUI component, on the published base", () => {
    const adapters = Object.keys(components).filter((path) => /\/XWFlow[A-Za-z]+\.ts$/.test(path));
    expect(adapters.length).toBeGreaterThan(0);
    for (const path of adapters) {
      const base = path.replace(/\.ts$/, "");
      // XWUI's split: types, JSON schema, headless logic, pure view, stylesheet, adapter, docs and examples.
      for (const part of [".types.ts", ".json", ".logic.ts", ".view.ts", ".css", ".md", ".examples.ts"]) expect(Object.keys(components), `${base}${part}`).toContain(`${base}${part}`);
      expect(components[path], path).toMatch(/extends XWUIComponent\b/);
      expect(components[path], path).toMatch(/from "\.\.\/\.\.\/xwui"/);
    }
  });

  it("names app components XWFlow and registers only xwflow- tags", () => {
    for (const [path, code] of Object.entries(components)) {
      expect(path, path).not.toMatch(/\/XWUI[A-Z]/);
      // Registered the XWUI way, under the app's own xwflow- names only.
      expect(code, path).not.toMatch(/customElements\.define\(/);
      for (const [, tag] of code.matchAll(/createXWUIElement\(\s*\w+,\s*"([^"]+)"/g)) expect(tag, path).toMatch(/^xwflow-/);
      expect(code, path).not.toMatch(/class XWUI[A-Z]/);
      expect(code, path).not.toMatch(/["'`]\.?xwui-(?!hue)[a-z-]+/);
    }
  });
});
