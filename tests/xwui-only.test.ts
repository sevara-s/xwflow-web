import { describe, expect, it } from "vitest";

/**
 * The assessment rule: pages and shells build the UI only from XWUI
 * components (composer nodes), never from hand-written DOM, HTML or CSS.
 * This test reads every page, shell and the node kit and fails on any
 * construct that would break the rule.
 */
const sources = import.meta.glob(["../src/pages/**/*.ts", "../src/app/shells/*.ts", "../src/ui/*.ts", "../src/app/app.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const styles = import.meta.glob(["../src/pages/**/*.css", "../src/app/**/*.css", "../src/components/**/*"], { query: "?raw", import: "default", eager: true });

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
    for (const [what, pattern] of forbidden) expect(code, `${path} uses ${what}`).not.toMatch(pattern);
  });

  it("every routed page exports a view()", () => {
    const pages = Object.entries(sources).filter(([path]) => /\/pages\/(site|studio|admin)\/[a-z-]+\.ts$|\/pages\/views\/view\.ts$/.test(path) && !/\/(common|common-view|editor-inspector|landing-sections)\.ts$/.test(path));
    expect(pages.length).toBeGreaterThan(25);
    for (const [path, code] of pages) expect(code, path).toMatch(/export (async )?function view\(/);
  });

  it("keeps no page stylesheets or app components", () => {
    expect(Object.keys(styles)).toEqual([]);
  });
});
