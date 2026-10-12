import { api } from "../../api/client";
import { fill } from "../../app/format";
import { href, paths } from "../../app/router";
import { siteHref } from "../../app/site-links";
import type { ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { CodeToken, SelfHost } from "../../types/domain";
import { band, button, decoration, eyebrow, glass, grid, headline, iconTile, inset, keys, row, separator, sides, space, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import { pageMax } from "../../ui/layout";

const words = catalog.site.selfHost;
const stepHues: Hue[] = ["lime", "cyan", "violet", "pink", "orange"];

/** Body text with {placeholders} filled from the guide's defaults. */
function bodyText(template: string, guide: SelfHost): string {
  const values = Object.fromEntries(guide.defaults.map((item) => [item.id, item.value]));
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/** The commands as a shell script: comments and placeholders stay visible. */
function script(tokens: CodeToken[]): string {
  return tokens
    .map((token) =>
      "comment" in token
        ? `# ${token.comment}`
        : "placeholder" in token
          ? token.placeholder
          : [token.command, token.args, token.value, token.url].filter(Boolean).join(" "),
    )
    .join("\n");
}

function terminal(tokens: CodeToken[]): Node {
  return {
    tag: "xwui-code-block",
    data: { code: script(tokens) },
    config: { language: "bash", copyable: true, copyLabel: words.copy, copiedLabel: words.copied },
  };
}

function stepCard(number: number, title: string, items: Node[]): Node {
  return glass(
    row([tag(String(number), stepHues[(number - 1) % stepHues.length]), stack([text("h3", title, { level: 2 }), ...items], { gap: "m" })], { gap: "l", align: "flex-start" }),
    { pad: "m" },
  );
}

function firstFlow(offset: number): Node {
  const t = words.firstFlow;
  const lines = t.items.map((line) => {
    const [before, after] = line.text.split("{keys}");
    return row(
      [
        tag(line.key, line.color as Hue),
        text("small", before, { tone: "secondary" }),
        ...(after !== undefined ? [row(t.keys.map((key) => keys([key])), { gap: "xs" }), text("small", after, { tone: "secondary" })] : []),
      ],
      { gap: "s", wrap: true },
    );
  });
  return stepCard(offset + 1, t.title, [
    stack(lines, { gap: "s" }),
    row([button("primary", t.editor, { href: href(paths.flow("f_order_alert")) }), button("glass", t.receipt, { href: href(paths.run("r_7f39")) })], { gap: "m", wrap: true }),
  ]);
}

function aside(guide: SelfHost): Node {
  const defaults = glass(
    stack(
      [
        text("h3", words.defaults),
        ...guide.defaults.flatMap((item, index) => [
          ...(index ? [separator()] : []),
          row([text("small", item.label, { tone: "secondary" }), text("small", item.value, { mono: true })], { justify: "space-between" }),
        ]),
      ],
      { gap: "m" },
    ),
    { pad: "m" },
  );
  const secrets = glass(stack([iconTile("shield", "lime", "sm"), text("h3", words.secretsTitle), text("small", words.secretsBody, { tone: "secondary" })], { gap: "s" }), {
    pad: "m",
    key: "band-secrets",
  });
  const pending = guide.pendingCommands
    ? [{ tag: "xwui-alert", data: { message: fill(words.pending, { n: guide.pendingCommands }) }, config: { variant: "warning", size: "small" } }]
    : [];
  return stack([defaults, secrets, ...pending], { gap: "l" });
}

export async function view(_context: ViewContext): Promise<Node[]> {
  const guide = await api.getSelfHost();

  const intro = stack(
    [
      eyebrow(words.eyebrow),
      headline("h1", words.title, words.titleHighlight),
      text("lead", words.lead),
      row([button("primary", words.start, { size: "lg", href: siteHref("selfHost", "steps") }), button("gradient", words.licence, { size: "lg", href: siteHref("pricing") })], {
        gap: "m",
        wrap: true,
      }),
    ],
    { gap: "xl" },
  );
  const art: Node = {
    tag: "xwui-box",
    config: { position: "relative", height: 360 },
    slots: {
      children: stack(
        [
          { tag: "xwui-iso-stack", data: { layers: [{ hue: "violet" }, { hue: "cyan" }, { hue: "pink" }, { hue: "lime" }] }, config: { size: 260, spacing: 46, height: 360 } },
          decoration("self-host.orb"),
        ],
        { gap: "none" },
      ),
    },
  };
  const hero: Node = {
    tag: "xwui-box",
    key: "band-hero",
    config: { as: "section", position: "relative", padding: inset("hero", "xl") },
    slots: {
      children: stack(
        [
          decoration("self-host.halo"),
          { tag: "xwui-container", config: { maxWidth: pageMax, center: true, padding: sides("xl") }, slots: { children: grid([intro, art], "half", "xxxl") } },
        ],
        { gap: "none" },
      ),
    },
  };

  const steps = stack(
    [
      ...guide.steps.map((step, index) => stepCard(index + 1, step.title, [text("body", bodyText(step.body, guide), { tone: "secondary" }), terminal(step.code)])),
      firstFlow(guide.steps.length),
    ],
    { gap: "l" },
  );

  return [hero, band("steps", [{ tag: "xwui-grid", data: { spans: [2, 1] }, config: { columns: 3, gap: space("xl"), alignItems: "start" }, slots: { children: [steps, aside(guide)] } }])];
}
