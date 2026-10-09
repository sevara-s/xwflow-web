import type { XWFlowSiteHeaderData } from "./XWFlowSiteHeader.types";

export interface SiteHeaderSlots {
  language: HTMLElement;
  signIn: HTMLElement;
  start: HTMLElement;
}

const markMarkup = `<svg class="xwflow-mark__glyph" viewBox="0 0 32 32" aria-hidden="true">
  <defs>
    <linearGradient id="xwflow-mark-fill" x1="4" y1="30" x2="30" y2="2" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f8d348"/>
      <stop offset="0.38" stop-color="#f25c38"/>
      <stop offset="0.68" stop-color="#d13cae"/>
      <stop offset="1" stop-color="#7a4dff"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#xwflow-mark-fill)"/>
  <rect x="7.5" y="7.5" width="17" height="17" rx="5" fill="none" stroke="#fff" stroke-width="2"/>
  <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" stroke-width="2"/>
  <circle cx="22.2" cy="9.6" r="1.25" fill="#fff"/>
</svg>`;

export function renderSiteHeader(container: HTMLElement, data: XWFlowSiteHeaderData): SiteHeaderSlots {
  container.classList.add("xwflow-site-header");
  container.replaceChildren();

  const bar = document.createElement("div");
  bar.className = "xwflow-site-header__bar";

  const brand = document.createElement("a");
  brand.className = "xwflow-mark";
  brand.href = "#/home";
  brand.innerHTML = markMarkup;
  const name = document.createElement("span");
  name.className = "xwflow-mark__name";
  name.textContent = data.wordmark;
  brand.append(name);

  const nav = document.createElement("nav");
  nav.className = "xwflow-site-header__nav";
  nav.setAttribute("aria-label", data.wordmark);
  for (const link of data.links) {
    const anchor = document.createElement("a");
    anchor.className = "xwflow-site-header__link";
    anchor.href = link.href;
    anchor.textContent = link.label;
    nav.append(anchor);
  }

  const actions = document.createElement("div");
  actions.className = "xwflow-site-header__actions";
  const language = document.createElement("div");
  language.className = "xwflow-cmd is-quiet";
  const signIn = document.createElement("div");
  signIn.className = "xwflow-cmd is-quiet";
  const start = document.createElement("div");
  start.className = "xwflow-cmd is-lime is-compact";
  actions.append(language, signIn, start);

  bar.append(brand, nav, actions);
  container.append(bar);
  return { language, signIn, start };
}
