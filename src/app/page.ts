import type { Workspace } from "../types/domain";
import type { MountScope } from "./mount";
import type { Route } from "./router";

/** What every page receives. Pages render into `body`; Studio pages add their bar to `header`. */
export interface PageContext<R extends Route = Route> {
  route: R;
  scope: MountScope;
  header: HTMLElement;
  body: HTMLElement;
  workspace: Workspace;
  /** Re-render the current page in place, for example after a write. */
  refresh: () => void;
}

export type PageRenderer<R extends Route = Route> = (context: PageContext<R>) => Promise<void> | void;
