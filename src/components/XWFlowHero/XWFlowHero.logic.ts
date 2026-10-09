import type { XWFlowHeroData } from "./XWFlowHero.types";

export function heroHeadline(data: XWFlowHeroData): { title: string; accent: string } {
  return { title: data.title, accent: data.accent };
}
