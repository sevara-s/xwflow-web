import type { XWFlowStepIconConfig, XWFlowStepIconData } from "./XWFlowStepIcon.types";

export function paintStepIcon(container: HTMLElement, data: XWFlowStepIconData, config: XWFlowStepIconConfig): HTMLElement {
  container.className = ["xwflow-step-icon", config.className].filter(Boolean).join(" ");
  container.dataset.group = data.group;
  container.dataset.size = config.size ?? "md";
  container.toggleAttribute("data-ghost", Boolean(config.ghost));
  container.setAttribute("aria-hidden", "true");
  const host = document.createElement("span");
  host.className = "xwflow-step-icon__glyph";
  container.replaceChildren(host);
  return host;
}
