import { el } from "../../app/dom";
import type { XWFlowStatusConfig, XWFlowStatusData } from "./XWFlowStatus.types";

export function renderStatus(container: HTMLElement, data: XWFlowStatusData, config: XWFlowStatusConfig): void {
  container.className = ["xwflow-status", config.className].filter(Boolean).join(" ");
  container.dataset.tone = data.tone;
  container.dataset.size = config.size ?? "md";
  container.replaceChildren(el("i", "xwflow-status__glyph"), el("span", "xwflow-status__label", data.label));
  container.querySelector("i")?.setAttribute("aria-hidden", "true");
}
