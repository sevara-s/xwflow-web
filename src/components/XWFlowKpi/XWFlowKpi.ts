import { XWUIComponent, XWUIDisplayStatistic } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowKpi.css?inline";
import type { XWFlowKpiConfig, XWFlowKpiData } from "./XWFlowKpi.types";
import { renderKpi } from "./XWFlowKpi.view";

registerStyles("XWFlowKpi", css);

/** A headline number on a glowing tile. The number itself is an XWUIDisplayStatistic. */
export class XWFlowKpi extends XWUIComponent<XWFlowKpiData, XWFlowKpiConfig> {
  static componentName = "XWFlowKpi";

  private statistic: XWUIDisplayStatistic | null = null;

  constructor(container: HTMLElement, data: XWFlowKpiData, config: XWFlowKpiConfig = {}) {
    super(container, data, config);
    this.render();
  }

  override setData(data: XWFlowKpiData): void {
    super.setData(data);
    this.render();
  }

  private render(): void {
    this.statistic?.destroy();
    const slots = renderKpi(this.container, this.data, this.config);
    this.statistic = new XWUIDisplayStatistic(
      slots.statistic,
      { title: this.data.label, value: this.data.value ?? undefined },
      {
        title: this.data.label,
        valueType: this.data.value === null ? "text" : "integer",
        size: "lg",
        placeholder: this.data.emptyLabel,
        emptyLabel: this.data.emptyLabel,
      },
    );
  }

  override destroy(): void {
    this.statistic?.destroy();
    super.destroy();
  }
}
