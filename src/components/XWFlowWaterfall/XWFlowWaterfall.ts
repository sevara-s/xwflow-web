import { XWUIComponent } from "../../xwui";
import groupsCss from "../groups.css?inline";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowWaterfall.css?inline";
import type { XWFlowWaterfallConfig, XWFlowWaterfallData } from "./XWFlowWaterfall.types";
import { renderWaterfall } from "./XWFlowWaterfall.view";

registerStyles("XWFlowGroups", groupsCss);
registerStyles("XWFlowWaterfall", css);

/** A run's attempts on one time axis: when each step started and how long it took. */
export class XWFlowWaterfall extends XWUIComponent<XWFlowWaterfallData, XWFlowWaterfallConfig> {
  static componentName = "XWFlowWaterfall";

  constructor(container: HTMLElement, data: XWFlowWaterfallData, config: XWFlowWaterfallConfig = {}) {
    super(container, data, config);
    renderWaterfall(this.container, this.data, this.config);
  }

  override setData(data: XWFlowWaterfallData): void {
    super.setData(data);
    renderWaterfall(this.container, this.data, this.config);
  }
}
