import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, notationViews, paths, type NotationView } from "../../app/router";
import { revealSection } from "../../app/site-links";
import { XWFlowNotationThumb } from "../../components/XWFlowNotationThumb/XWFlowNotationThumb";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { catalog } from "../../content/catalog";
import type { Notation, NotationFamily, NotationGallery, NotationViewId } from "../../types/domain";
import { XWUINavTabs, XWUISegmentedControl, XWUITag } from "../../xwui";
import { eyebrow, headline, section } from "./common";

type SiteRoute = Extract<PageContext["route"], { zone: "site" }>;

const words = catalog.site.notations;

/** Where a notation's "Open view" goes: the editor, a notation view, or the run receipt. */
function viewHref(view: NotationViewId, sample: NotationGallery["sample"]): string {
  if (view === "editor") return href(paths.flow(sample.flowId));
  if (view === "receipt") return sample.runId ? href(paths.run(sample.runId)) : href(paths.runs);
  return (notationViews as readonly string[]).includes(view) ? href(paths.flowView(sample.flowId, view as NotationView)) : href(paths.flow(sample.flowId));
}

export async function render(context: PageContext<SiteRoute>): Promise<void> {
  const { scope, body, route } = context;
  let gallery = await api.getNotations();
  const sample = gallery.sample;

  const hero = el("section", "xwflow-hero xwflow-hero--page");
  body.append(hero);
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 520, color: "violet", place: { left: "-60px", top: "-80px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 460, color: "pink", place: { right: "-60px", top: "120px" } }));
  const intro = el("div", "xwflow-container xwflow-stack xwflow-gap-24 xwflow-center");
  hero.append(intro);
  const tags = el("div", "xwflow-row xwflow-gap-8");
  intro.append(tags);
  for (const tag of words.tags) {
    scope.track(new XWUITag(slot(tags), { label: fill(tag.label, { n: gallery.total }) }, { size: "small", className: `xwflow-tag xwflow-tag--${tag.color}` }));
  }
  intro.append(headline("h1", "xwflow-h-mega", words.title, words.titleHighlight), el("p", "xwflow-lead xwflow-measure", words.lead));

  const modeHost = slot(intro, "xwflow-segmented");
  const modes = scope.track(
    new XWUISegmentedControl(modeHost, { value: words.modes[0].id }, { options: words.modes.map((mode) => ({ value: mode.id, label: mode.label })), ariaLabel: words.modeLabel }),
  );
  modes.onChange?.((value: string) => {
    const mode = words.modes.find((item) => item.id === value);
    if (mode?.view) window.location.hash = viewHref(mode.view as NotationViewId, sample);
    else if (mode) notify(fill(words.conceptNote, { name: mode.label }), "info");
  });

  renderLayers(hero, scope, sample);
  renderModes(body, scope, sample);

  const wrap = section(body, "gallery");
  const head = el("div", "xwflow-wrap xwflow-gap-24 xwflow-align-end");
  wrap.append(head);
  const title = el("div", "xwflow-stack xwflow-gap-12");
  head.append(title);
  eyebrow(title, words.galleryEyebrow);
  title.append(headline("h2", "xwflow-h2", words.galleryTitle, words.galleryHighlight));
  const familyHost = slot(head, "xwflow-tabs xwflow-push");
  const families = scope.track(
    new XWUINavTabs(familyHost, { tabs: words.families.map((item) => ({ id: item.id || "all", label: item.label })), activeTab: "all" }, {
      variant: "button",
      size: "sm",
      ariaLabel: words.familiesLabel,
      hideContent: "true",
    }),
  );
  const grid = el("div", "xwflow-grid");
  grid.style.setProperty("--xwflow-min", "300px");
  wrap.append(grid);

  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  const show = (): void => {
    owned.splice(0).forEach((item) => item.destroy());
    grid.replaceChildren();
    for (const notation of gallery.items) grid.append(card(notation, { track: (item) => (owned.push(item), item) }, gallery.sample));
  };
  families.onChange(async (id) => {
    gallery = await api.getNotations({ family: id === "all" ? "" : (id as NotationFamily) });
    show();
  });
  show();
  revealSection(body, route.section);
}

function renderLayers(hero: HTMLElement, scope: Tracker, sample: NotationGallery["sample"]): void {
  const stack = el("div", "xwflow-layers");
  stack.setAttribute("role", "img");
  stack.setAttribute("aria-label", words.layersLabel);
  hero.append(stack);
  const kinds = ["node-graph", "bpmn", "flowchart"];
  const colors = ["lime", "orange", "cyan"];
  kinds.forEach((kind, index) => {
    const layer = el("div", "xwflow-layers__layer");
    layer.dataset.color = colors[index];
    layer.style.setProperty("--xwflow-z", `${(2 - index) * 120}px`);
    stack.append(layer);
    scope.track(new XWFlowNotationThumb(slot(layer), { notation: kind, steps: sample.steps, label: words.layers[index] }, { className: "xwflow-layers__thumb" }));
    const label = el("span", "xwflow-layers__label", words.layers[index]);
    label.dataset.color = colors[index];
    label.style.top = `${120 + index * 120}px`;
    stack.append(label);
  });
}

function renderModes(body: HTMLElement, scope: Tracker, sample: NotationGallery["sample"]): void {
  const wrap = section(body, "modes", "xwflow-section xwflow-section--tight");
  const head = el("div", "xwflow-stack xwflow-gap-8");
  wrap.append(head);
  eyebrow(head, words.modesEyebrow);
  const title = el("h2", "xwflow-h2");
  title.append(`${words.modesTitle} `, el("span", "xwflow-grad-text", words.modesHighlight), ` ${words.modesTail}`);
  head.append(title);
  const grid = el("div", "xwflow-grid");
  grid.style.setProperty("--xwflow-min", "220px");
  wrap.append(grid);
  for (const mode of words.modes) {
    const tile = el(mode.view ? "a" : "div", "xwflow-mode");
    if (tile instanceof HTMLAnchorElement && mode.view) tile.href = viewHref(mode.view as NotationViewId, sample);
    tile.dataset.group = mode.group;
    const row = el("div", "xwflow-row xwflow-gap-12");
    scope.track(new XWFlowStepIcon(slot(row), { icon: mode.icon, group: mode.group as never }));
    row.append(el("b", undefined, mode.label));
    tile.append(row, el("p", "xwflow-small xwflow-sec", mode.body));
    grid.append(tile);
  }
}

function card(notation: Notation, scope: Tracker, sample: NotationGallery["sample"]): HTMLElement {
  const node = el("article", "xwflow-notation");
  scope.track(new XWFlowNotationThumb(slot(node), { notation: notation.id, steps: sample.steps, label: `${notation.name}: ${notation.summary}` }));
  const head = el("div", "xwflow-row xwflow-gap-8");
  head.append(el("h3", "xwflow-notation__name", notation.name));
  scope.track(new XWUITag(slot(head, "xwflow-push"), { label: notation.dims }, { size: "small", className: "xwflow-tag xwflow-tag--lime" }));
  node.append(head, el("span", "xwflow-notation__std", notation.standard), el("p", "xwflow-small xwflow-sec", notation.summary));
  const tags = el("div", "xwflow-wrap xwflow-gap-8");
  node.append(tags);
  for (const tag of notation.tags) scope.track(new XWUITag(slot(tags), { label: tag }, { size: "small", className: "xwflow-tag" }));
  if (notation.view) {
    const link = el("a", "xwflow-tag-link");
    link.href = viewHref(notation.view, sample);
    tags.append(link);
    scope.track(new XWUITag(slot(link), { label: words.open }, { size: "small", className: "xwflow-tag xwflow-tag--cyan" }));
  } else if (notation.concept) {
    scope.track(new XWUITag(slot(tags), { label: words.concept }, { size: "small", className: "xwflow-tag xwflow-tag--plan" }));
  }
  return node;
}
