import { admin } from "./admin";
import { project } from "./project";
import { site } from "./site";
import { views } from "./views";
import { studio } from "./studio";

export const catalog = {
  brand: "xwflow",
  loading: "Loading",
  units: { ms: "{n} ms" },
  time: { justNow: "just now", minutesAgo: "{n} min ago" },
  errors: {
    load: "This page could not load. Try again.",
    save: "That change was not saved. Try again.",
    missing: "Not found",
  },
  notFound: {
    title: "This page does not exist",
    description: "The link may be old, or the item was deleted.",
    action: "Go to the flows",
  },
  studio,
  project,
  site,
  admin,
  views,
} as const;
