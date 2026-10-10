import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowStackedBars.css?inline";
import type { XWFlowStackedBarsConfig, XWFlowStackedBarsData } from "./XWFlowStackedBars.types";
import { renderStackedBars } from "./XWFlowStackedBars.view";

registerStyles("XWFlowStackedBars", css);

/** Stacked columns over time: the healthy part as a gradient, failures in red on top. */
export class XWFlowStackedBars extends XWUIComponent<XWFlowStackedBarsData, XWFlowStackedBarsConfig> {
  static componentName = "XWFlowStackedBars";

  constructor(container: HTMLElement, data: XWFlowStackedBarsData, config: XWFlowStackedBarsConfig = {}) {
    super(container, data, config);
    renderStackedBars(this.container, this.data, this.config);
  }
}
