import type { XWFlowSiteHeaderData } from "./XWFlowSiteHeader.types";

export function projectHeader(data: XWFlowSiteHeaderData): XWFlowSiteHeaderData {
  return {
    ...data,
    links: data.links.map((link) => ({ ...link })),
  };
}
