import { href, paths } from "./router";

export type SiteTarget = "landing" | "integrations" | "pricing" | "selfHost" | "notations" | "studio";

const targets: Record<SiteTarget, string> = {
  landing: paths.home,
  integrations: paths.integrations,
  pricing: paths.pricing,
  selfHost: paths.selfHost,
  notations: paths.notations,
  studio: paths.studio,
};

/** A link to a site page, optionally to one of its sections. */
export function siteHref(target: SiteTarget, section?: string | null): string {
  return href(targets[target], { section: section ?? undefined });
}

/** Scroll to `#section` on the page once it has rendered. */
export function revealSection(root: HTMLElement, section: string | null): void {
  if (!section) return;
  const target = root.querySelector<HTMLElement>(`[data-section="${CSS.escape(section)}"]`);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}
