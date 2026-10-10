import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatNumber } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import { href, paths } from "../../app/router";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { XWFlowWaterfall } from "../../components/XWFlowWaterfall/XWFlowWaterfall";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowBrand } from "../../components/XWFlowBrand/XWFlowBrand";
import { catalog } from "../../content/catalog";
import type { AssistantDraft, Landing, StatusTone, StepGroup } from "../../types/domain";
import { XWUIButton, XWUIKbd, XWUITag } from "../../xwui";
import { eyebrow, headline, linkButton, section } from "./common";

const words = catalog.site.landing;
const types = catalog.studio.stepTypes;
const tagColor: Record<StepGroup, string> = { trigger: "lime", control: "orange", data: "violet", ai: "pink", integration: "cyan" };

export function renderLandingSections(body: HTMLElement, scope: Tracker, landing: Landing): void {
  renderStats(body, landing);
  renderMarquee(body, scope, landing);
  renderPrompt(body, scope);
  renderTruth(body, scope, landing);
  renderBrand(body, scope, landing);
  renderNotations(body, scope, landing);
  renderMigrate(body, landing);
  renderStart(body, scope);
}

function renderStats(body: HTMLElement, landing: Landing): void {
  const wrap = section(body, "stats", "xwflow-section xwflow-section--tight");
  const panel = el("div", "xwflow-glass xwflow-grid xwflow-stats");
  panel.dataset.pad = "l";
  panel.style.setProperty("--xwflow-min", "230px");
  wrap.append(panel);
  for (const stat of words.stats) {
    const value = landing.stats[stat.id as keyof Landing["stats"]];
    const cell = el("div", "xwflow-stack xwflow-gap-4");
    const number = el("div", "xwflow-display xwflow-stats__value", "unit" in stat ? fill(stat.unit, { n: value }) : formatNumber(value));
    if (stat.id === "dialects") number.classList.add("xwflow-grad-text");
    cell.append(number, el("div", "xwflow-strong", stat.label), el("div", "xwflow-small xwflow-sec", stat.note));
    panel.append(cell);
  }
}

function renderMarquee(body: HTMLElement, scope: Tracker, landing: Landing): void {
  const band = el("section", "xwflow-marquee");
  band.setAttribute("aria-label", words.marqueeLabel);
  body.append(band);
  const track = el("div", "xwflow-marquee__track");
  band.append(track);
  // Two copies make the loop seamless; the second is hidden from assistive technology.
  for (const copy of [0, 1]) {
    const group = el("div", "xwflow-marquee__group");
    if (copy) group.setAttribute("aria-hidden", "true");
    for (const item of landing.marquee) {
      scope.track(new XWUITag(slot(group), { label: item.label }, { size: "small", className: `xwflow-tag xwflow-tag--${tagColor[item.group]}` }));
    }
    track.append(group);
  }
}

function renderPrompt(body: HTMLElement, scope: Tracker): void {
  const text = words.prompt;
  const wrap = section(body, "prompt");
  const split = el("div", "xwflow-split");
  wrap.append(split);
  const left = el("div", "xwflow-stack xwflow-gap-24");
  split.append(left);
  eyebrow(left, text.eyebrow);
  left.append(headline("h2", "xwflow-h2", text.title, text.titleHighlight), el("p", "xwflow-lead", text.lead));

  const promptCard = el("div", "xwflow-glass xwflow-stack xwflow-gap-12");
  promptCard.dataset.pad = "s";
  left.append(promptCard);
  const request = el("div", "xwflow-small", text.example);
  promptCard.append(request);
  const row = el("div", "xwflow-row xwflow-gap-8");
  promptCard.append(row);
  scope.track(new XWUITag(slot(row), { label: text.project }, { size: "small", className: "xwflow-tag" }));
  const build = scope.track(new XWUIButton(slot(row, "xwflow-push"), { text: text.build }, { variant: "primary", size: "sm" }));
  const chips = el("div", "xwflow-wrap xwflow-gap-8");
  left.append(chips);
  for (const chip of text.chips) {
    const button = scope.track(new XWUIButton(slot(chips), { text: chip }, { variant: "ghost", size: "sm", className: "xwflow-pill" }));
    button.onClick(() => {
      request.textContent = chip;
      void draft(chip);
    });
  }

  const right = el("div", "xwflow-relative");
  split.append(right);
  scope.track(new XWFlowShape(slot(right), { kind: "halo" }, { size: 360, color: "violet", place: { left: "10%", top: "10%" } }));
  const panel = el("div", "xwflow-glass xwflow-stack xwflow-gap-16 xwflow-glow-violet");
  panel.dataset.pad = "m";
  right.append(panel);
  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });

  const showDraft = (title: string, steps: Array<{ name: string; type: string; group: StepGroup }>, streamed: number): void => {
    owned.splice(0).forEach((item) => item.destroy());
    panel.replaceChildren();
    const head = el("div", "xwflow-row xwflow-gap-8");
    head.append(el("b", undefined, text.draft));
    panel.append(head);
    owned.push(new XWUITag(slot(head), { label: text.streaming }, { size: "small", className: "xwflow-tag xwflow-tag--violet" }));
    head.append(el("span", "xwflow-xs xwflow-ter xwflow-push", fill(text.steps, { n: steps.length })));
    panel.setAttribute("aria-label", title);
    const list = el("div", "xwflow-stack xwflow-gap-12");
    panel.append(list);
    steps.forEach((step, index) => {
      const item = el("div", "xwflow-glass xwflow-row xwflow-gap-12");
      item.dataset.pad = "s";
      const type = types[step.type as keyof typeof types];
      owned.push(new XWFlowStepIcon(slot(item), { icon: type?.icon ?? catalog.studio.groupIcons[step.group], group: step.group }, { size: "sm" }));
      const label = el("div", "xwflow-grow");
      label.append(el("div", "xwflow-strong xwflow-small", step.name), el("div", "xwflow-xs xwflow-sec", type?.label ?? step.type));
      item.append(label);
      const needs = step.type === "needsConnection";
      const tone: StatusTone = index < streamed ? (needs ? "warn" : "ok") : index === streamed ? "run" : "idle";
      owned.push(new XWFlowStatus(slot(item), { tone, label: "" }));
      list.append(item);
    });
    if (streamed >= steps.length && steps.some((step) => step.type === "needsConnection")) {
      const band = el("div", "xwflow-band xwflow-small", text.connect);
      band.dataset.tone = "lime";
      panel.append(band);
    }
  };

  const timers: number[] = [];
  scope.track({ destroy: () => timers.splice(0).forEach((id) => clearTimeout(id)) });
  async function draft(prompt: string): Promise<void> {
    timers.splice(0).forEach((id) => clearTimeout(id));
    try {
      build.setLoading(true);
      const result: AssistantDraft = await api.draftFlow(prompt);
      const steps = result.graph.nodes.map((node) => ({ name: node.name, type: node.type, group: node.group }));
      steps.forEach((_, index) => timers.push(window.setTimeout(() => showDraft(result.title, steps, index), index * 450)));
      timers.push(window.setTimeout(() => showDraft(result.title, steps, steps.length), steps.length * 450));
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      build.setLoading(false);
    }
  }
  build.onClick(() => void draft(request.textContent ?? text.example));
  void draft(text.example);
}

function renderTruth(body: HTMLElement, scope: Tracker, landing: Landing): void {
  const text = words.truth;
  const wrap = section(body, "truth");
  const head = el("div", "xwflow-stack xwflow-gap-16 xwflow-center");
  wrap.append(head);
  eyebrow(head, text.eyebrow);
  head.append(headline("h2", "xwflow-h2", text.title, text.titleHighlight));

  const bento = el("div", "xwflow-bento");
  wrap.append(bento);
  const tile = (span: 2 | 4, tag: string, color: string): HTMLElement => {
    const node = el("div", `xwflow-glass xwflow-stack xwflow-gap-16 xwflow-bento__s${span}`);
    node.dataset.pad = "l";
    bento.append(node);
    scope.track(new XWUITag(slot(node), { label: tag }, { size: "small", className: `xwflow-tag xwflow-tag--${color}` }));
    return node;
  };

  const receipt = tile(4, text.receiptTag, "cyan");
  receipt.append(el("h3", "xwflow-h3", text.receiptTitle), el("p", "xwflow-sec", text.receiptBody));
  const attempts = landing.receipt?.attempts.filter((item) => item.result.kind !== "notRun") ?? [];
  scope.track(
    new XWFlowWaterfall(slot(receipt), {
      label: text.receiptTitle,
      rows: attempts.map((item) => ({
        id: item.id,
        label: item.tryCount && item.tryCount > 1 ? `${item.step}, ${item.tryIndex}` : item.step,
        startMs: item.result.kind === "disabled" ? null : item.offsetMs ?? 0,
        durationMs: item.result.kind === "disabled" ? null : item.durationMs ?? 0,
        caption: item.result.kind === "failed" ? String(item.result.code) : item.durationMs !== null ? `${item.durationMs} ms` : "",
        group: item.group,
        failed: item.result.kind === "failed",
        muted: item.result.kind === "disabled",
      })),
    }),
  );

  const states = tile(2, text.statesTag, "violet");
  states.append(el("h3", "xwflow-h3", text.statesTitle));
  const list = el("div", "xwflow-stack xwflow-gap-8");
  states.append(list);
  for (const state of text.states) {
    const row = el("div", "xwflow-glass");
    row.dataset.pad = "s";
    scope.track(new XWFlowStatus(slot(row), { tone: state.tone, label: state.label }));
    list.append(row);
  }

  const keys = tile(2, text.keysTag, "lime");
  keys.append(el("h3", "xwflow-h3", text.keysTitle));
  const keyRow = el("div", "xwflow-wrap xwflow-gap-8");
  keys.append(keyRow);
  for (const key of text.keys) scope.track(new XWUIKbd(slot(keyRow), { keys: key }, { size: "md" }));
  keys.append(el("p", "xwflow-small xwflow-sec", text.keysBody));

  const language = tile(2, text.languageTag, "pink");
  const word = el("div", "xwflow-display xwflow-grad-text xwflow-bento__word", text.languageWord);
  word.lang = "ar";
  word.dir = "rtl";
  language.append(word, el("p", "xwflow-small xwflow-sec", text.languageBody));

  const host = tile(2, text.hostTag, "orange");
  host.append(el("h3", "xwflow-h3", text.hostTitle));
  const rack = el("div", "xwflow-rack");
  rack.setAttribute("aria-hidden", "true");
  text.hostRack.forEach((_, index) => {
    const slab = el("i");
    slab.style.top = `${index * 34}px`;
    slab.style.setProperty("--xwflow-z", `${index * 34}px`);
    rack.append(slab);
  });
  host.append(rack);
}

function renderBrand(body: HTMLElement, scope: Tracker, landing: Landing): void {
  const text = words.brand;
  const wrap = section(body, "brand");
  const split = el("div", "xwflow-split");
  wrap.append(split);
  const left = el("div", "xwflow-stack xwflow-gap-24");
  split.append(left);
  eyebrow(left, text.eyebrow);
  left.append(headline("h2", "xwflow-h2", text.title, text.titleHighlight), el("p", "xwflow-lead", text.lead));
  const list = el("div", "xwflow-stack xwflow-gap-12");
  left.append(list);
  text.items.forEach((item, index) => {
    const row = el("div", "xwflow-row xwflow-gap-12");
    const groups: StepGroup[] = ["integration", "ai", "trigger", "data"];
    scope.track(new XWFlowStepIcon(slot(row), { icon: item.icon, group: groups[index % groups.length] }, { size: "sm", ghost: true }));
    row.append(el("span", "xwflow-grow", item.label));
    scope.track(new XWUITag(slot(row), { label: text.planned }, { size: "small", className: "xwflow-tag xwflow-tag--plan" }));
    list.append(row);
  });
  linkButton(slot(left), scope, text.cta, { site: "pricing" }, "gradient");

  const fan = el("div", "xwflow-fan");
  fan.setAttribute("role", "img");
  fan.setAttribute("aria-label", text.fanLabel);
  split.append(fan);
  landing.tenants.forEach((tenant, index) => {
    const card = el("div", "xwflow-fan__card");
    card.dataset.color = tenant.color;
    card.style.setProperty("--xwflow-hue", `${tenant.hue}deg`);
    card.style.setProperty("--xwflow-fan-index", String(index));
    const head = el("div", "xwflow-row xwflow-gap-8");
    scope.track(new XWFlowBrand(slot(head), { label: tenant.name, href: href(paths.home) }, { size: "sm" }));
    card.append(head);
    const row = el("div", "xwflow-row xwflow-gap-8");
    scope.track(new XWUIButton(slot(row), { text: text.run }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass", disabled: true }));
    scope.track(new XWUITag(slot(row), { label: text.published }, { size: "small", className: `xwflow-tag xwflow-tag--${tenant.color}` }));
    card.append(row);
    for (let bar = 0; bar < 3; bar += 1) card.append(el("i", "xwflow-fan__bar"));
    if (index === 1) card.append(el("p", "xwflow-xs xwflow-sec", text.noMark));
    fan.append(card);
  });
}

function renderNotations(body: HTMLElement, scope: Tracker, landing: Landing): void {
  const text = words.notations;
  const wrap = section(body, "notations");
  const panel = el("div", "xwflow-glass xwflow-clip xwflow-notation-band");
  panel.dataset.pad = "l";
  wrap.append(panel);
  scope.track(new XWFlowShape(slot(panel), { kind: "halo" }, { size: 420, color: "pink", place: { right: "-80px", bottom: "-160px" } }));
  const split = el("div", "xwflow-split");
  panel.append(split);
  const left = el("div", "xwflow-stack xwflow-gap-16");
  split.append(left);
  eyebrow(left, text.eyebrow);
  left.append(headline("h2", "xwflow-h2", text.title, fill(text.titleHighlight, { n: landing.notations.length })), el("p", "xwflow-lead", text.lead));
  const ctas = el("div", "xwflow-wrap xwflow-gap-12");
  left.append(ctas);
  linkButton(slot(ctas), scope, text.gallery, { site: "notations" }, "primary");
  linkButton(slot(ctas), scope, text.open3d, { href: href(paths.flowView(landing.flow.id, "3d")) }, "gradient");

  const tags = el("div", "xwflow-wrap xwflow-gap-8 xwflow-relative");
  split.append(tags);
  const familyColor: Record<string, string> = { automation: "lime", process: "orange", software: "pink", simulation: "amber", analysis: "plain", views: "cyan" };
  for (const notation of landing.notations) {
    const color = notation.view ? familyColor[notation.family] : "plain";
    const host = notation.view ? el("a", "xwflow-tag-link") : el("span");
    if (host instanceof HTMLAnchorElement) {
      host.href =
        notation.view === "editor"
          ? href(paths.flow(landing.flow.id))
          : notation.view === "receipt"
            ? href(paths.run(landing.receipt?.id ?? ""))
            : href(paths.flowView(landing.flow.id, notation.view as never));
    }
    tags.append(host);
    scope.track(new XWUITag(slot(host), { label: notation.name }, { size: "small", className: `xwflow-tag xwflow-tag--${color}` }));
  }
}

function renderMigrate(body: HTMLElement, landing: Landing): void {
  const text = words.migrate;
  const wrap = section(body, "migrate");
  const head = el("div", "xwflow-wrap xwflow-gap-24 xwflow-align-end");
  wrap.append(head);
  const title = el("div", "xwflow-stack xwflow-gap-16");
  head.append(title);
  eyebrow(title, text.eyebrow);
  title.append(headline("h2", "xwflow-h2", text.title, text.titleHighlight));
  head.append(el("p", "xwflow-sec xwflow-migrate__note", text.body));
  const grid = el("div", "xwflow-grid xwflow-migrate");
  grid.style.setProperty("--xwflow-min", "220px");
  wrap.append(grid);
  const colors = ["lime", "cyan", "violet", "pink", "orange"];
  landing.dialects.forEach((dialect, index) => {
    const tile = el("div", "xwflow-dial");
    const code = el("span", "xwflow-dial__code", dialect.code);
    code.dataset.color = colors[index % colors.length];
    const name = el("span", "xwflow-row xwflow-gap-12 xwflow-strong");
    name.append(code, dialect.name);
    const depth = el("span", "xwflow-xs xwflow-sec");
    depth.append(`${text.depth} `, el("span", "xwflow-placeholder", dialect.depth ?? text.pending));
    tile.append(name, depth);
    grid.append(tile);
  });
}

function renderStart(body: HTMLElement, scope: Tracker): void {
  const text = words.start;
  const wrap = section(body, "start");
  const panel = el("div", "xwflow-glass xwflow-clip xwflow-start");
  panel.dataset.border = "gradient";
  wrap.append(panel);
  scope.track(new XWFlowShape(slot(panel), { kind: "ring" }, { size: 260, thickness: 10, place: { right: "6%", top: "-40px" } }));
  scope.track(new XWFlowShape(slot(panel), { kind: "orb" }, { size: 70, color: "lime", place: { right: "18%", bottom: "40px" } }));
  const content = el("div", "xwflow-stack xwflow-gap-24 xwflow-relative");
  panel.append(content);
  eyebrow(content, text.eyebrow);
  content.append(headline("h2", "xwflow-h1", text.title, text.titleHighlight), el("p", "xwflow-lead", text.lead));
  const ctas = el("div", "xwflow-wrap xwflow-gap-12");
  content.append(ctas);
  const open = scope.track(new XWUIButton(slot(ctas), { text: text.primary }, { variant: "primary", size: "lg" }));
  open.onClick(() => {
    document.querySelector('[data-section="sandbox"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector<HTMLButtonElement>(".xwflow-sandbox__tools .xwui-button-primary")?.click();
  });
  linkButton(slot(ctas), scope, text.secondary, { site: "selfHost" }, "glass", "lg");
}
