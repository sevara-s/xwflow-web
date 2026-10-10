import { el } from "../../app/dom";
import { stackHeights } from "./XWFlowStackedBars.logic";
import type { XWFlowStackedBarsConfig, XWFlowStackedBarsData } from "./XWFlowStackedBars.types";

export function renderStackedBars(container: HTMLElement, data: XWFlowStackedBarsData, config: XWFlowStackedBarsConfig): void {
  const height = config.height ?? 220;
  container.className = ["xwflow-stacked", config.className].filter(Boolean).join(" ");
  const chart = el("div", "xwflow-stacked__chart");
  chart.style.height = `${height}px`;
  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", data.label);
  stackHeights(data.bars, height - 8).forEach((part) => {
    const column = el("div", "xwflow-stacked__column");
    const alert = el("i", "xwflow-stacked__alert");
    alert.style.height = `${part.alert}px`;
    const base = el("i", "xwflow-stacked__base");
    base.style.height = `${part.base}px`;
    column.append(alert, base);
    chart.append(column);
  });
  const axis = el("div", "xwflow-stacked__axis");
  axis.append(el("span", undefined, data.start), el("span", undefined, data.end));
  container.replaceChildren(chart, axis);
}
