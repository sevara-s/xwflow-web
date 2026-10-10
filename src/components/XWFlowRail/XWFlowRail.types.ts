import type { StatusTone } from "../../types/domain";

export interface RailItem {
  id: string;
  label: string;
  href: string;
  /** XWUI icon name; omitted when the item shows a swatch. */
  icon?: string;
  /** A gradient square, used for the project switcher. */
  swatch?: boolean;
  /** A trailing chevron, for items that open a picker. */
  caret?: boolean;
  badge?: { label: string; tone: "lime" | "amber" };
  /** A status glyph at the end of the item, e.g. a failing health check. */
  status?: { tone: StatusTone; label: string };
}

export interface RailSection {
  id: string;
  title?: string;
  items: RailItem[];
}

export interface XWFlowRailData {
  brand: { label: string; href: string };
  labels: {
    nav: string;
    /** Omit search and create for rails that only navigate. */
    search?: string;
    searchAria?: string;
    searchKeys?: string;
    create?: string;
    collapse: string;
    expand: string;
  };
  /** A tag next to the brand, such as "Admin". */
  headTag?: { label: string; color: "violet" | "lime" };
  sections: RailSection[];
  footer: RailItem[];
  usage: { label: string; caption: string; ratio: number; ariaLabel: string } | null;
  selected: string;
}

export interface XWFlowRailConfig {
  collapsed?: boolean;
  /** The narrower admin rail. */
  slim?: boolean;
  className?: string;
}

export interface XWFlowRailEvents {
  search: (query: string) => void;
  create: (anchor: HTMLElement) => void;
  toggle: (collapsed: boolean) => void;
}
