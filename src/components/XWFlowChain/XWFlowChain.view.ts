import { el } from "../../app/dom";
import type { XWFlowChainConfig, XWFlowChainData } from "./XWFlowChain.types";

export function renderChain(container: HTMLElement, data: XWFlowChainData, config: XWFlowChainConfig): void {
  container.className = ["xwflow-chain", config.className].filter(Boolean).join(" ");
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", data.label);
  const parts: HTMLElement[] = [];
  data.groups.forEach((group, index) => {
    if (index > 0) parts.push(el("b", "xwflow-chain__link"));
    const dot = el("i", "xwflow-chain__dot");
    dot.dataset.group = group;
    parts.push(dot);
  });
  container.replaceChildren(...parts);
}
