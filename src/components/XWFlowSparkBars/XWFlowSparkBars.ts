import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowSparkBars.css?inline";
import type { XWFlowSparkBarsConfig, XWFlowSparkBarsData } from "./XWFlowSparkBars.types";
import { renderSparkBars } from "./XWFlowSparkBars.view";

registerStyles("XWFlowSparkBars", css);

/** A compact bar sparkline (runs per hour) where failing periods turn red. */
export class XWFlowSparkBars extends XWUIComponent<XWFlowSparkBarsData, XWFlowSparkBarsConfig> {
  static componentName = "XWFlowSparkBars";

  constructor(container: HTMLElement, data: XWFlowSparkBarsData, config: XWFlowSparkBarsConfig = {}) {
    super(container, data, config);
    renderSparkBars(this.container, this.data, this.config);
  }

  override setData(data: XWFlowSparkBarsData): void {
    super.setData(data);
    renderSparkBars(this.container, this.data, this.config);
  }
}
