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
    search: string;
    searchAria: string;
    searchKeys: string;
    create: string;
    collapse: string;
    expand: string;
  };
  sections: RailSection[];
  footer: RailItem[];
  usage: { label: string; caption: string; ratio: number; ariaLabel: string } | null;
  selected: string;
}

export interface XWFlowRailConfig {
  collapsed?: boolean;
  className?: string;
}

export interface XWFlowRailEvents {
  search: (query: string) => void;
  create: (anchor: HTMLElement) => void;
  toggle: (collapsed: boolean) => void;
}
