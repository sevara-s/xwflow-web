import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import type { PageContext } from "../../app/page";
import { href, paths } from "../../app/router";
import { revealSection } from "../../app/site-links";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { catalog } from "../../content/catalog";
import type { CodeToken, SelfHost } from "../../types/domain";
import { XWUIButtonCopy, XWUIKbd, XWUITag } from "../../xwui";
import { eyebrow, headline, linkButton } from "./common";

type SiteRoute = Extract<PageContext["route"], { zone: "site" }>;

const words = catalog.site.selfHost;
const stepColors = ["lime", "cyan", "violet", "pink", "orange"];

export async function render(context: PageContext<SiteRoute>): Promise<void> {
  const { scope, body, route } = context;
  const guide = await api.getSelfHost();

  const hero = el("section", "xwflow-hero xwflow-hero--page");
  body.append(hero);
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 520, color: "violet", place: { left: "-80px", top: "-60px" } }));
  const split = el("div", "xwflow-container xwflow-split");
  hero.append(split);
  const text = el("div", "xwflow-stack xwflow-gap-24 xwflow-relative");
  split.append(text);
  eyebrow(text, words.eyebrow);
  text.append(headline("h1", "xwflow-h1", words.title, words.titleHighlight), el("p", "xwflow-lead", words.lead));
  const ctas = el("div", "xwflow-wrap xwflow-gap-12");
  text.append(ctas);
  linkButton(slot(ctas), scope, words.start, { site: "selfHost", section: "steps" }, "primary", "lg");
  linkButton(slot(ctas), scope, words.licence, { site: "pricing" }, "gradient", "lg");

  const scene = el("div", "xwflow-stack-scene");
  scene.setAttribute("aria-hidden", "true");
  split.append(scene);
  const stack = el("div", "xwflow-stack-scene__layers");
  scene.append(stack);
  ["violet", "cyan", "pink", "lime"].forEach((color, index) => {
    const layer = el("i");
    layer.dataset.color = color;
    layer.style.setProperty("--xwflow-z", `${index * 46}px`);
    stack.append(layer);
  });
  scope.track(new XWFlowShape(slot(scene), { kind: "orb" }, { size: 46, color: "lime", place: { right: "16%", top: "20px" } }));

  const main = el("div", "xwflow-container xwflow-selfhost");
  main.dataset.section = "steps";
  body.append(main);
  const steps = el("ol", "xwflow-steps");
  steps.setAttribute("aria-label", words.stepsLabel);
  main.append(steps);
  guide.steps.forEach((step, index) => steps.append(renderStep(scope, guide, step, index)));
  steps.append(renderFirstFlow(scope, guide.steps.length));

  const aside = el("aside", "xwflow-stack xwflow-gap-16 xwflow-selfhost__aside");
  main.append(aside);
  const defaults = el("div", "xwflow-glass xwflow-stack xwflow-gap-12");
  defaults.dataset.pad = "m";
  aside.append(defaults);
  defaults.append(el("h2", "xwflow-h3", words.defaults));
  guide.defaults.forEach((item, index) => {
    if (index) defaults.append(el("hr", "xwflow-sep"));
    const row = el("div", "xwflow-row xwflow-small");
    row.append(el("span", "xwflow-sec", item.label), el("span", "xwflow-mono xwflow-push", item.value));
    defaults.append(row);
  });
  const secrets = el("div", "xwflow-glass xwflow-stack xwflow-gap-8");
  secrets.dataset.pad = "m";
  secrets.dataset.section = "secrets";
  aside.append(secrets);
  scope.track(new XWFlowStepIcon(slot(secrets), { icon: "shield", group: "trigger" }, { size: "sm" }));
  secrets.append(el("h2", "xwflow-h3", words.secretsTitle), el("p", "xwflow-small xwflow-sec", words.secretsBody));
  if (guide.pendingCommands) {
    const warn = el("div", "xwflow-band xwflow-small", fill(words.pending, { n: guide.pendingCommands }));
    warn.dataset.tone = "warn";
    aside.append(warn);
  }
  revealSection(body, route.section);
}

/** Body text with {placeholders} for default values drawn as lime monospace. */
function bodyText(template: string, guide: SelfHost): HTMLElement {
  const values = Object.fromEntries(guide.defaults.map((item) => [item.id, item.value]));
  const node = el("p", "xwflow-sec");
  for (const part of template.split(/(\{\w+\}|XWFLOW_WEB_\w+)/)) {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    if (key) node.append(el("span", "xwflow-mono xwflow-lime", values[key] ?? part));
    else if (/^XWFLOW_WEB_/.test(part)) node.append(el("span", "xwflow-mono", part));
    else node.append(part);
  }
  return node;
}

function commandText(tokens: CodeToken[]): string {
  return tokens
    .filter((token) => !("comment" in token) && !("placeholder" in token))
    .map((token) => ("command" in token ? [token.command, token.args, token.value, token.url].filter(Boolean).join(" ") : ""))
    .join("\n");
}

function terminal(scope: Tracker, tokens: CodeToken[]): HTMLElement {
  const term = el("div", "xwflow-terminal");
  const bar = el("div", "xwflow-terminal__bar");
  for (const color of ["red", "amber", "green"]) {
    const dot = el("i");
    dot.dataset.color = color;
    bar.append(dot);
  }
  term.append(bar);
  const code = el("pre", "xwflow-terminal__code");
  for (const token of tokens) {
    const line = el("span", "xwflow-terminal__line");
    if ("comment" in token) line.append(el("span", "xwflow-code-comment", `# ${token.comment}`));
    else if ("placeholder" in token) line.append(el("span", "xwflow-placeholder", token.placeholder));
    else {
      line.append(el("span", "xwflow-code-keyword", token.command));
      if (token.args) line.append(` ${token.args}`);
      if (token.value) line.append(" ", el("span", "xwflow-code-string", token.value));
      if (token.url) line.append(" ", el("span", "xwflow-code-number", token.url));
    }
    code.append(line);
  }
  term.append(code);
  const copyText = commandText(tokens);
  if (copyText) {
    const copy = slot(bar, "xwflow-push");
    scope.track(new XWUIButtonCopy(copy, { text: words.copy, value: copyText, copiedText: words.copied }, { variant: "ghost", size: "xs" }));
  }
  return term;
}

function renderStep(scope: Tracker, guide: SelfHost, step: SelfHost["steps"][number], index: number): HTMLElement {
  const item = el("li", "xwflow-glass xwflow-steps__item");
  item.dataset.pad = "m";
  const number = el("span", "xwflow-steps__num", String(index + 1));
  number.dataset.color = stepColors[index % stepColors.length];
  item.append(number);
  const content = el("div", "xwflow-stack xwflow-gap-12");
  item.append(content);
  content.append(el("h2", "xwflow-h3", step.title), bodyText(step.body, guide), terminal(scope, step.code));
  return item;
}

function renderFirstFlow(scope: Tracker, offset: number): HTMLElement {
  const text = words.firstFlow;
  const item = el("li", "xwflow-glass xwflow-steps__item");
  item.dataset.pad = "m";
  const number = el("span", "xwflow-steps__num", String(offset + 1));
  number.dataset.color = stepColors[offset % stepColors.length];
  item.append(number);
  const content = el("div", "xwflow-stack xwflow-gap-12");
  item.append(content);
  content.append(el("h2", "xwflow-h3", text.title));
  const list = el("div", "xwflow-stack xwflow-gap-8 xwflow-sec");
  content.append(list);
  for (const line of text.items) {
    const row = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
    scope.track(new XWUITag(slot(row), { label: line.key }, { size: "small", className: `xwflow-tag xwflow-tag--${line.color}` }));
    const [before, after] = line.text.split("{keys}");
    row.append(before);
    if (after !== undefined) {
      for (const key of text.keys) scope.track(new XWUIKbd(slot(row), { keys: key }, { size: "sm" }));
      row.append(after);
    }
    list.append(row);
  }
  const ctas = el("div", "xwflow-wrap xwflow-gap-12");
  content.append(ctas);
  linkButton(slot(ctas), scope, text.editor, { href: href(paths.flow("f_order_alert")) }, "primary");
  linkButton(slot(ctas), scope, text.receipt, { href: href(paths.run("r_7f39")) }, "glass");
  return item;
}
