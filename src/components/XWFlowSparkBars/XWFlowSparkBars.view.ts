import { el } from "../../app/dom";
import { barHeights } from "./XWFlowSparkBars.logic";
import type { XWFlowSparkBarsConfig, XWFlowSparkBarsData } from "./XWFlowSparkBars.types";

export function renderSparkBars(container: HTMLElement, data: XWFlowSparkBarsData, config: XWFlowSparkBarsConfig): void {
  container.className = ["xwflow-spark", config.className].filter(Boolean).join(" ");
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", data.label);
  if (config.height) container.style.height = `${config.height}px`;
  const heights = barHeights(data.bars);
  container.replaceChildren(
    ...data.bars.map((bar, index) => {
      const node = el("i", "xwflow-spark__bar");
      node.style.height = `${Math.round(heights[index] * 100)}%`;
      if (bar.alert) node.dataset.alert = "";
      return node;
    }),
  );
}
