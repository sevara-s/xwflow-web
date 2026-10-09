import { getOverview } from "../api/client";
import { boardState, patchBoard, watchBoard } from "./board";
import { catalog } from "../content/catalog";
import { appConfig } from "../config";
import { icon } from "./icons";
import { MountScope } from "./mount";
import { mountToaster } from "./notify";
import { openCreateProcess } from "../pages/processes";
import { renderLanding } from "../pages/landing";
import { renderPage } from "../pages/render";
import { href, navigate, parseLocation, startRouter, type Route } from "./router";
import { XWUIComponent } from "../xwui";
import "../styles/studio.css";

const lightPreset = "https://xwui.dev/styles/presets/light.css";
const darkPreset = "https://xwui.dev/styles/presets/dark.css";

const footIcons: Record<string, string> = {
  admin: "shield",
  templates: "layout",
  insights: "chart",
  settings: "sliders",
};

const railIcons: Record<string, string> = {
  assistant: "assistant",
  overview: "grid",
};

export function mountApplication(root: HTMLElement): void {
  const theme = appConfig.theme;
  document.documentElement.dataset.theme = theme.theme;
  document.documentElement.dataset.accent = theme.accent;
  document.documentElement.dataset.style = theme.style;
  document.documentElement.dataset.roundness = theme.roundness;
  document.documentElement.dataset.font = theme.font;
  document.title = catalog.documentTitle;
  XWUIComponent.configure(appConfig.xwui);

  const landingHost = document.createElement("div");
  landingHost.className = "xwflow-surface";
  const studioHost = document.createElement("div");
  studioHost.className = "xwflow-surface";
  studioHost.hidden = true;
  root.replaceChildren(landingHost, studioHost);

  const landingScope = new MountScope();
  let landingReady = false;
  let studio: { show(route: Route): void } | null = null;

  startRouter((route) => {
    const marketing = route.name === "landing";
    applyChrome(marketing);
    landingHost.hidden = !marketing;
    studioHost.hidden = marketing;
    if (marketing) {
      if (!landingReady) {
        renderLanding(landingHost, landingScope);
        landingReady = true;
      }
      return;
    }
    if (!studio) studio = createStudio(studioHost);
    studio.show(route);
  });
}

function applyChrome(marketing: boolean): void {
  document.documentElement.dataset.page = marketing ? "landing" : "studio";
  document.documentElement.dataset.theme = marketing ? appConfig.theme.theme : "dark";
  document.title = marketing ? catalog.documentTitle : catalog.studio.documentTitle;
  const link = document.getElementById("xwui-preset");
  if (link instanceof HTMLLinkElement) {
    const next = marketing ? lightPreset : darkPreset;
    if (link.href !== next) link.href = next;
  }
}

function createStudio(host: HTMLElement): { show(route: Route): void } {
  const shellScope = new MountScope();
  const studio = document.createElement("div");
  studio.className = "xwflow-studio";
  if (boardState().collapsed) studio.classList.add("is-collapsed");

  const rail = document.createElement("aside");
  rail.className = "xwflow-rail";
  rail.setAttribute("aria-label", catalog.navLabel);

  const brandRow = document.createElement("div");
  brandRow.className = "xwflow-rail__brand";
  const brand = document.createElement("a");
  brand.className = "xwflow-mark";
  brand.href = href(catalog.paths.overview);
  brand.innerHTML = markMarkup;
  const word = document.createElement("span");
  word.className = "xwflow-mark__name";
  word.textContent = catalog.studio.wordmark;
  brand.append(word);
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.className = "xwflow-icon-btn";
  collapse.append(icon("panel"));
  brandRow.append(brand, collapse);

  const searchWrap = document.createElement("label");
  searchWrap.className = "xwflow-rail__search";
  searchWrap.append(icon("search"));
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = catalog.studio.search;
  search.setAttribute("aria-label", catalog.studio.search);
  search.value = boardState().query;
  const kbd = document.createElement("kbd");
  kbd.className = "xwflow-rail__kbd";
  kbd.textContent = catalog.studio.searchHint;
  searchWrap.append(search, kbd);

  const create = document.createElement("button");
  create.type = "button";
  create.className = "xwflow-create";
  create.append(icon("plus"));
  const createLabel = document.createElement("span");
  createLabel.textContent = catalog.studio.create;
  create.append(createLabel);

  const nav = document.createElement("nav");
  nav.className = "xwflow-rail__nav";
  const railLinks: HTMLElement[] = [];
  for (const item of catalog.studio.rail) {
    const badge = "badge" in item ? item.badge : undefined;
    railLinks.push(railLink(nav, item.label, item.path, railIcons[item.id] ?? "grid", item.id, badge));
  }
  const projectLabel = document.createElement("p");
  projectLabel.className = "xwflow-rail__section";
  projectLabel.textContent = catalog.studio.projectLabel;
  nav.append(projectLabel);
  const project = document.createElement("a");
  project.className = "xwflow-rail__project";
  project.href = href(catalog.paths.overview);
  project.dataset.rail = "project";
  project.setAttribute("aria-label", catalog.studio.project);
  const dot = document.createElement("span");
  dot.className = "xwflow-rail__dot";
  dot.setAttribute("aria-hidden", "true");
  const projectText = document.createElement("span");
  projectText.className = "xwflow-rail__text";
  projectText.textContent = catalog.studio.project;
  project.append(dot, projectText, icon("chevron"));
  project.querySelector("svg")?.classList.add("xwflow-rail__chevron");
  nav.append(project);
  railLinks.push(project);

  const chatsLabel = document.createElement("p");
  chatsLabel.className = "xwflow-rail__section";
  chatsLabel.textContent = catalog.studio.chatsLabel;
  nav.append(chatsLabel);
  const chatLinks: HTMLElement[] = [];
  for (const chat of catalog.studio.chats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "xwflow-rail__link";
    button.dataset.chat = chat.id;
    button.setAttribute("aria-label", chat.label);
    button.append(icon("chat"));
    const text = document.createElement("span");
    text.className = "xwflow-rail__text";
    text.textContent = chat.label;
    button.append(text);
    if ("badge" in chat && chat.badge) {
      const badge = document.createElement("span");
      badge.className = "xwflow-rail__badge is-wait";
      badge.textContent = chat.badge;
      button.append(badge);
    }
    button.addEventListener("click", () => {
      patchBoard({
        query: chat.query,
        chatId: chat.id,
        sampleRows: true,
        tab: "flows",
        status: "",
        folder: "",
      });
      if (parseLocation().name !== "overview") navigate(catalog.paths.overview);
    });
    nav.append(button);
    chatLinks.push(button);
  }

  const foot = document.createElement("div");
  foot.className = "xwflow-rail__foot";
  for (const item of catalog.studio.foot) {
    const link = railLink(foot, item.label, item.path, footIcons[item.id] ?? "shield", item.id);
    railLinks.push(link);
  }

  rail.append(brandRow, searchWrap, create, nav, foot);

  const main = document.createElement("div");
  main.className = "xwflow-studio__main";
  const top = document.createElement("header");
  top.className = "xwflow-top";
  const crumbs = document.createElement("p");
  crumbs.className = "xwflow-crumbs";
  const crumbRoot = document.createElement("span");
  crumbRoot.textContent = catalog.studio.crumbRoot;
  const slash = document.createElement("span");
  slash.className = "xwflow-crumbs__slash";
  slash.textContent = "/";
  const crumbCurrent = document.createElement("strong");
  crumbs.append(crumbRoot, slash, crumbCurrent);
  const tools = document.createElement("div");
  tools.className = "xwflow-top__tools";
  const sample = document.createElement("button");
  sample.type = "button";
  sample.className = "xwflow-sample";
  sample.append(document.createElement("span"), document.createTextNode(catalog.studio.sampleRows));
  const sampleDot = sample.querySelector("span");
  if (sampleDot) sampleDot.className = "xwflow-sample__dot";
  const avatar = document.createElement("span");
  avatar.className = "xwflow-avatar is-top";
  avatar.setAttribute("role", "img");
  tools.append(sample, avatar);
  top.append(crumbs, tools);

  const page = document.createElement("main");
  page.className = "xwflow-page";
  main.append(top, page);
  studio.append(rail, main);
  host.replaceChildren(studio);

  const toastHost = document.createElement("div");
  host.append(toastHost);
  mountToaster(toastHost);

  void getOverview().then((overview) => {
    avatar.title = overview.actor;
    avatar.setAttribute("aria-label", overview.actor);
  });

  let pages = new MountScope();
  create.addEventListener("click", () => openCreateProcess(pages, () => undefined));
  collapse.addEventListener("click", () => patchBoard({ collapsed: !boardState().collapsed }));
  search.addEventListener("input", () => {
    patchBoard({ query: search.value, chatId: "" });
    if (parseLocation().name !== "overview") navigate(catalog.paths.overview);
  });
  searchWrap.addEventListener("click", () => {
    if (!boardState().collapsed) return;
    patchBoard({ collapsed: false });
    search.focus();
  });
  sample.addEventListener("click", () => patchBoard({ sampleRows: !boardState().sampleRows }));

  const onKey = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (boardState().collapsed) patchBoard({ collapsed: false });
      search.focus();
      search.select();
    }
  };
  document.addEventListener("keydown", onKey);
  shellScope.track({ destroy: () => document.removeEventListener("keydown", onKey) });

  const sync = () => {
    const view = boardState();
    studio.classList.toggle("is-collapsed", view.collapsed);
    collapse.setAttribute("aria-label", view.collapsed ? catalog.studio.expand : catalog.studio.collapse);
    collapse.setAttribute("aria-expanded", String(!view.collapsed));
    sample.setAttribute("aria-pressed", String(view.sampleRows));
    sample.classList.toggle("is-on", view.sampleRows);
    if (document.activeElement !== search) search.value = view.query;
    for (const link of chatLinks) {
      link.classList.toggle("is-current", link.dataset.chat === view.chatId);
    }
  };
  watchBoard(sync, shellScope);
  sync();

  return {
    show(route: Route) {
      const current = railCurrent(route);
      for (const link of railLinks) {
        const on = link.dataset.rail === current;
        link.classList.toggle("is-current", on);
        if (on) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
      crumbCurrent.textContent = crumbFor(route);
      pages.destroy();
      pages = new MountScope();
      page.replaceChildren();
      void renderPage(page, pages, route);
    },
  };
}

function railLink(
  host: HTMLElement,
  label: string,
  path: string,
  glyph: string,
  railId: string,
  badge?: string,
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "xwflow-rail__link";
  link.href = href(path);
  link.dataset.rail = railId;
  link.setAttribute("aria-label", label);
  link.append(icon(glyph));
  const text = document.createElement("span");
  text.className = "xwflow-rail__text";
  text.textContent = label;
  link.append(text);
  if (badge) {
    const pill = document.createElement("span");
    pill.className = "xwflow-rail__badge";
    pill.textContent = badge;
    link.append(pill);
  }
  host.append(link);
  return link;
}

function railCurrent(route: Route): string {
  switch (route.name) {
    case "assistant":
    case "templates":
    case "insights":
    case "settings":
      return route.name;
    case "landing":
    case "notFound":
      return "";
    default:
      return "project";
  }
}

function crumbFor(route: Route): string {
  switch (route.name) {
    case "assistant":
      return catalog.studio.assistant;
    case "templates":
      return catalog.studio.previews.templates.title;
    case "insights":
      return catalog.studio.previews.insights.title;
    case "settings":
      return catalog.studio.previews.settings.title;
    case "processes":
    case "process":
      return catalog.processes.title;
    case "runs":
    case "run":
      return catalog.runs.title;
    default:
      return catalog.studio.project;
  }
}

const markMarkup = `<svg class="xwflow-mark__glyph" viewBox="0 0 32 32" aria-hidden="true">
  <defs>
    <linearGradient id="xwflow-studio-mark" x1="4" y1="30" x2="30" y2="2" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f8d348"/>
      <stop offset="0.38" stop-color="#f25c38"/>
      <stop offset="0.68" stop-color="#d13cae"/>
      <stop offset="1" stop-color="#7a4dff"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#xwflow-studio-mark)"/>
  <rect x="7.5" y="7.5" width="17" height="17" rx="5" fill="none" stroke="#fff" stroke-width="2"/>
  <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" stroke-width="2"/>
  <circle cx="22.2" cy="9.6" r="1.25" fill="#fff"/>
</svg>`;
