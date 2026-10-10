import { el } from "../../app/dom";
import type { XWFlowBrandConfig, XWFlowBrandData } from "./XWFlowBrand.types";

export function renderBrand(container: HTMLElement, data: XWFlowBrandData, config: XWFlowBrandConfig): void {
  const link = el("a", "xwflow-brand");
  link.href = data.href;
  link.dataset.size = config.size ?? "md";
  link.setAttribute("aria-label", data.label);
  link.append(el("span", "xwflow-brand__mark"));
  if (!config.markOnly) link.append(el("span", "xwflow-brand__word", data.label));
  container.replaceChildren(link);
}
