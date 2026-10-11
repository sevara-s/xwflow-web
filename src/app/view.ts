import type { Node } from "../ui/kit";
import type { AdminContext, Workspace } from "../types/domain";
import type { Route } from "./router";

/** What a composed page receives. It returns XWUI composer nodes and holds no DOM. */
export interface ViewContext<R extends Route = Route> {
  route: R;
  workspace: Workspace;
  /** The tenant and health signal, on admin, system and denied pages; null elsewhere. */
  admin: AdminContext | null;
  /** Build the page again from fresh data, for example after a write. */
  refresh: () => void;
  /** The live XWUI instance of the node mounted with this key. */
  instance: <T = unknown>(key: string) => T | undefined;
  /** Register work to stop when the page goes away (timers, subscriptions). */
  onLeave: (stop: () => void) => void;
}

/** What an app page puts in the top bar (XWUIAppBar). */
export interface PageBar {
  crumbs: Array<{ label: string; href?: string }>;
  meta?: string;
  /** "rows" or "data" marks illustrative content with a dashed tag. */
  sample?: "rows" | "data" | null;
  tags?: Array<{ label: string; hue?: string }>;
  actions?: Node[];
  hideAccount?: boolean;
}

/** A page's nodes, plus its top bar when it sits in an app shell. */
export interface PageResult {
  bar?: PageBar;
  body: Node[];
}

export type PageView<R extends Route = Route> = (context: ViewContext<R>) => Promise<Node[] | PageResult> | Node[] | PageResult;
