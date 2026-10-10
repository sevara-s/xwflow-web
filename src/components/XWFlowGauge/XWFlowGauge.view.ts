import { el } from "../../app/dom";
import { gaugePercent } from "./XWFlowGauge.logic";
import type { XWFlowGaugeConfig, XWFlowGaugeData } from "./XWFlowGauge.types";

export function renderGauge(container: HTMLElement, data: XWFlowGaugeData, config: XWFlowGaugeConfig): void {
  container.className = ["xwflow-gauge", config.className].filter(Boolean).join(" ");
  container.dataset.tone = config.tone ?? "green";
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", data.label);
  container.style.setProperty("--xwflow-gauge-fill", `${gaugePercent(data.value, data.total)}%`);
  if (config.size) container.style.setProperty("--xwflow-gauge-size", `${config.size}px`);
  const face = el("div", "xwflow-gauge__face");
  face.append(el("span", "xwflow-gauge__value", `${data.value}/${data.total}`), el("span", "xwflow-gauge__caption", data.caption));
  container.replaceChildren(face);
}
