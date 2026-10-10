import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowGauge.css?inline";
import type { XWFlowGaugeConfig, XWFlowGaugeData } from "./XWFlowGauge.types";
import { renderGauge } from "./XWFlowGauge.view";

registerStyles("XWFlowGauge", css);

/** A ring that fills with progress and shows "value/total" in its centre. */
export class XWFlowGauge extends XWUIComponent<XWFlowGaugeData, XWFlowGaugeConfig> {
  static componentName = "XWFlowGauge";

  constructor(container: HTMLElement, data: XWFlowGaugeData, config: XWFlowGaugeConfig = {}) {
    super(container, data, config);
    renderGauge(this.container, this.data, this.config);
  }

  override setData(data: XWFlowGaugeData): void {
    super.setData(data);
    renderGauge(this.container, this.data, this.config);
  }
}
