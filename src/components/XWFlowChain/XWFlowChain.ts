import { XWUIComponent } from "../../xwui";
import groupsCss from "../groups.css?inline";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowChain.css?inline";
import type { XWFlowChainConfig, XWFlowChainData } from "./XWFlowChain.types";
import { renderChain } from "./XWFlowChain.view";

registerStyles("XWFlowGroups", groupsCss);
registerStyles("XWFlowChain", css);

/** A flow's steps in order, one coloured dot per step group. */
export class XWFlowChain extends XWUIComponent<XWFlowChainData, XWFlowChainConfig> {
  static componentName = "XWFlowChain";

  constructor(container: HTMLElement, data: XWFlowChainData, config: XWFlowChainConfig = {}) {
    super(container, data, config);
    renderChain(this.container, this.data, this.config);
  }

  override setData(data: XWFlowChainData): void {
    super.setData(data);
    renderChain(this.container, this.data, this.config);
  }
}
