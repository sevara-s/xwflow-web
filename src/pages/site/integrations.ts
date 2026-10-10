import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { debounce } from "../../app/timing";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { NodeType, StepGroup } from "../../types/domain";
import { XWUIButton, XWUIEmpty, XWUIInputText, XWUIKbd, XWUINavTabs, XWUITag } from "../../xwui";
import { eyebrow, headline } from "./common";

const words = catalog.site.integrations;
const groups: StepGroup[] = ["trigger", "control", "data", "ai", "integration"];
const groupColor: Record<StepGroup, string> = { trigger: "lime", control: "orange", data: "violet", ai: "pink", integration: "cyan" };

export async function render(context: PageContext): Promise<void> {
  const { scope, body } = context;
  const query: { q: string; group: StepGroup | "" } = { q: "", group: "" };
  let result = await api.listNodeTypes();

  const hero = el("section", "xwflow-hero xwflow-hero--page");
  body.append(hero);
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 520, color: "cyan", place: { left: "20%", top: "-120px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "cube" }, { size: 64, color: "lime", place: { left: "12%", top: "80px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "cube" }, { size: 44, color: "pink", place: { right: "14%", top: "200px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "orb" }, { size: 70, color: "violet", place: { right: "9%", top: "40px" } }));

  const intro = el("div", "xwflow-container xwflow-stack xwflow-gap-24 xwflow-center");
  hero.append(intro);
  eyebrow(intro, words.eyebrow);
  intro.append(headline("h1", "xwflow-h1", words.title, words.titleHighlight));
  intro.append(el("p", "xwflow-lead xwflow-measure", fill(words.lead, { n: result.total })));

  const searchBox = el("div", "xwflow-glass xwflow-directory-search");
  intro.append(searchBox);
  const keys = document.createElement("span");
  scope.track(new XWUIKbd(keys, { keys: words.searchKeys }, { size: "sm" }));
  const search = scope.track(
    new XWUIInputText(slot(searchBox), { placeholder: words.search }, { type: "search", leadingIcon: "search", ariaLabel: words.searchLabel, suffix: keys, fullWidth: true, size: "lg" }),
  );
  const tabsHost = slot(intro, "xwflow-tabs xwflow-tabs--center");
  const tabs = scope.track(
    new XWUINavTabs(
      tabsHost,
      { tabs: [{ id: "all", label: words.all }, ...groups.map((group) => ({ id: group, label: catalog.studio.groupLabels[group] }))], activeTab: "all" },
      { variant: "button", size: "sm", ariaLabel: words.groupsLabel, hideContent: "true" },
    ),
  );

  const main = el("div", "xwflow-container xwflow-stack xwflow-gap-24 xwflow-directory");
  body.append(main);
  const note = el("div", "xwflow-band xwflow-small", words.note);
  note.dataset.tone = "info";
  main.append(note);
  const list = el("div", "xwflow-stack xwflow-gap-24");
  main.append(list);

  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  const tracker: Tracker = { track: (item) => (owned.push(item), item) };

  const show = (): void => {
    owned.splice(0).forEach((item) => item.destroy());
    list.replaceChildren();
    const featured = result.items.find((item) => item.featured);
    const rest = result.items.filter((item) => item !== featured);
    if (!result.items.length) {
      tracker.track(new XWUIEmpty(slot(list), { icon: "search", title: words.empty.title, description: words.empty.description }));
      return;
    }
    if (featured) list.append(featuredCard(featured, tracker));
    const grid = el("div", "xwflow-grid");
    grid.style.setProperty("--xwflow-min", "230px");
    list.append(grid);
    for (const item of rest) grid.append(card(item, tracker));
    if (!query.q && !query.group) {
      const more = el("div", "xwflow-integration");
      more.dataset.group = "integration";
      more.append(el("span", "xwflow-display xwflow-integration__plus", "+"), el("b", undefined, words.more), el("p", "xwflow-small xwflow-sec", words.moreBody));
      grid.append(more);
    }
  };

  const reload = async (): Promise<void> => {
    result = await api.listNodeTypes(query);
    show();
  };
  search.onChange(
    debounce((value: string) => {
      query.q = value.trim();
      void reload();
    }, config.searchDebounceMs),
  );
  tabs.onChange((id) => {
    query.group = id === "all" ? "" : (id as StepGroup);
    void reload();
  });
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "/" || (event.target as HTMLElement).closest("input, textarea")) return;
    event.preventDefault();
    search.focus();
  };
  document.addEventListener("keydown", onKey);
  scope.track({ destroy: () => document.removeEventListener("keydown", onKey) });
  show();
}

function opened(item: NodeType): void {
  notify(fill(words.opened, { name: item.label, group: catalog.studio.groupLabels[item.group] }), "info");
}

function card(item: NodeType, scope: Tracker): HTMLElement {
  const node = el("button", "xwflow-integration");
  node.type = "button";
  node.dataset.group = item.group;
  const head = el("div", "xwflow-row xwflow-gap-12");
  const type = catalog.studio.stepTypes[item.id as keyof typeof catalog.studio.stepTypes];
  scope.track(new XWFlowStepIcon(slot(head), { icon: type?.icon ?? catalog.studio.groupIcons[item.group], group: item.group }));
  const name = el("div");
  name.append(el("b", undefined, item.label), el("div", "xwflow-xs xwflow-sec", catalog.studio.groupLabels[item.group]));
  head.append(name);
  node.append(head, el("p", "xwflow-small xwflow-sec", item.summary));
  node.addEventListener("click", () => opened(item));
  return node;
}

function featuredCard(item: NodeType, scope: Tracker): HTMLElement {
  const node = el("div", "xwflow-integration xwflow-integration--featured");
  node.dataset.group = item.group;
  const type = catalog.studio.stepTypes[item.id as keyof typeof catalog.studio.stepTypes];
  scope.track(new XWFlowStepIcon(slot(node), { icon: type?.icon ?? "sparkles", group: item.group }));
  const text = el("div", "xwflow-stack xwflow-gap-8 xwflow-grow");
  node.append(text);
  const tags = el("div", "xwflow-row xwflow-gap-8");
  text.append(tags);
  scope.track(new XWUITag(slot(tags), { label: words.featured }, { size: "small", className: `xwflow-tag xwflow-tag--${groupColor[item.group]}` }));
  scope.track(new XWUITag(slot(tags), { label: catalog.studio.groupLabels[item.group] }, { size: "small", className: "xwflow-tag" }));
  text.append(el("h2", "xwflow-h3", item.label), el("p", "xwflow-sec", item.summary));
  const view = scope.track(new XWUIButton(slot(node), { text: words.viewStep }, { variant: "ghost", className: "xwflow-btn-gradient" }));
  view.onClick(() => opened(item));
  return node;
}
