import type { Node } from "../ui/kit";
import type { Workspace } from "../types/domain";
import type { Route } from "./router";

/** What a composed page receives. It returns XWUI composer nodes and holds no DOM. */
export interface ViewContext<R extends Route = Route> {
  route: R;
  workspace: Workspace;
  /** Build the page again from fresh data, for example after a write. */
  refresh: () => void;
  /** The live XWUI instance of the node mounted with this key. */
  instance: <T = unknown>(key: string) => T | undefined;
  /** Register work to stop when the page goes away (timers, subscriptions). */
  onLeave: (stop: () => void) => void;
}

export type PageView<R extends Route = Route> = (context: ViewContext<R>) => Promise<Node[]> | Node[];
