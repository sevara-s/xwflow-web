import { el } from "../../app/dom";
import type { XWFlowShapeConfig, XWFlowShapeData } from "./XWFlowShape.types";

export function renderShape(container: HTMLElement, data: XWFlowShapeData, config: XWFlowShapeConfig): void {
  container.className = ["xwflow-shape", config.className].filter(Boolean).join(" ");
  container.dataset.kind = data.kind;
  container.dataset.color = config.color ?? "violet";
  container.toggleAttribute("data-still", Boolean(config.still));
  container.setAttribute("aria-hidden", "true");
  const style = container.style;
  if (config.size) style.setProperty("--xwflow-shape-size", `${config.size}px`);
  if (config.thickness) style.setProperty("--xwflow-shape-thickness", `${config.thickness}px`);
  for (const [side, value] of Object.entries(config.place ?? {})) style.setProperty(side, value);
  container.replaceChildren();
  if (data.kind === "cube") {
    for (let face = 0; face < 6; face += 1) container.append(el("i", "xwflow-shape__face"));
  }
}
