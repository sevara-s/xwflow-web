import { el } from "../../app/dom";
import type { XWFlowKpiConfig, XWFlowKpiData } from "./XWFlowKpi.types";

export interface KpiSlots {
  statistic: HTMLElement;
}

export function renderKpi(container: HTMLElement, data: XWFlowKpiData, config: XWFlowKpiConfig): KpiSlots {
  container.className = ["xwflow-kpi", config.className].filter(Boolean).join(" ");
  container.dataset.tone = config.tone ?? "violet";
  container.toggleAttribute("data-emphasis", Boolean(config.emphasis));
  const statistic = el("div", "xwflow-kpi__statistic");
  container.replaceChildren(statistic);
  if (data.note) container.append(el("div", "xwflow-kpi__note", data.note));
  return { statistic };
}
