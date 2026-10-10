import type { RailItem, XWFlowRailData } from "./XWFlowRail.types";

/** Every item in display order, sections first, then the footer links. */
export function railItems(data: XWFlowRailData): RailItem[] {
  return [...data.sections.flatMap((section) => section.items), ...data.footer];
}

/** True when the shortcut that focuses the rail search was pressed. */
export function isSearchShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k";
}

/** Phones start with the rail closed so the page is the first thing on screen. */
export function startsCollapsed(requested: boolean | undefined): boolean {
  if (requested !== undefined) return requested;
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 860px)").matches;
}

/** Clamp the usage ratio so a bar never overflows its track. */
export function usagePercent(ratio: number): number {
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}
