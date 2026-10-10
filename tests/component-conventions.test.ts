import { describe, expect, it } from "vitest";

const files = import.meta.glob("../src/components/XWFlow*/*", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const names = [...new Set(Object.keys(files).map((path) => path.split("/")[3]))];
const file = (name: string, part: string): string | undefined => files[`../src/components/${name}/${name}${part}`];

describe("custom component conventions", () => {
  it("finds the custom components", () => {
    expect(names.length).toBeGreaterThan(10);
  });

  it.each(names.map((name) => [name]))("%s has the XWUI file split, a schema and a doc", (name: string) => {
    for (const part of [".ts", ".types.ts", ".view.ts", ".css", ".schema.json", ".md"]) {
      expect(file(name, part), `${name}${part}`).toBeDefined();
    }
    const source = file(name, ".ts") ?? "";
    expect(source).toMatch(new RegExp(`class ${name} extends XWUIComponent`));
    expect(source).toContain(`static componentName = "${name}"`);
    expect(source).toContain(`registerStyles("${name}"`);
    const schema = JSON.parse(file(name, ".schema.json") ?? "{}");
    expect(schema.id).toBe(name);
    expect(schema.properties.data.type).toBe("object");
    expect(schema.properties.conf_comp.type).toBe("object");
  });
});
