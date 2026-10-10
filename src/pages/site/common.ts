import { el, slot } from "../../app/dom";
import type { Tracker } from "../../app/mount";
import { siteHref, type SiteTarget } from "../../app/site-links";
import { XWUIButton } from "../../xwui";

export type ButtonStyle = "primary" | "glass" | "gradient";

/** A link styled as an XWUIButton. XWUIButton renders an anchor when given `href`. */
export function linkButton(
  host: HTMLElement,
  scope: Tracker,
  label: string,
  target: { site: SiteTarget; section?: string | null } | { href: string },
  style: ButtonStyle,
  size: "sm" | "md" | "lg" = "md",
  icon?: string,
): XWUIButton {
  const url = "href" in target ? target.href : siteHref(target.site, target.section);
  const config =
    style === "primary"
      ? { variant: "primary" }
      : { variant: "ghost", className: style === "glass" ? "xwflow-btn-glass" : "xwflow-btn-gradient" };
  return scope.track(new XWUIButton(host, { text: label }, { ...config, size, href: url, icon }));
}

/** "Title" + line break + gradient highlight, the headline pattern every section uses. */
export function headline(tag: "h1" | "h2", className: string, title: string, highlight: string, breakLine = true): HTMLElement {
  const node = el(tag, className);
  node.append(title);
  if (breakLine) node.append(el("br"));
  else node.append(" ");
  node.append(el("span", "xwflow-grad-text", highlight));
  return node;
}

export function section(parent: HTMLElement, id: string, className = "xwflow-section"): HTMLElement {
  const node = el("section", className);
  node.dataset.section = id;
  parent.append(node);
  const wrap = el("div", "xwflow-container xwflow-stack xwflow-gap-48");
  node.append(wrap);
  return wrap;
}

export function eyebrow(parent: HTMLElement, text: string): void {
  parent.append(el("span", "xwflow-eyebrow", text));
}

export { slot };
