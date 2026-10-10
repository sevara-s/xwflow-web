import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowBrand.css?inline";
import type { XWFlowBrandConfig, XWFlowBrandData } from "./XWFlowBrand.types";
import { renderBrand } from "./XWFlowBrand.view";

registerStyles("XWFlowBrand", css);

/** The xwflow mark and wordmark, linking home. */
export class XWFlowBrand extends XWUIComponent<XWFlowBrandData, XWFlowBrandConfig> {
  static componentName = "XWFlowBrand";

  constructor(container: HTMLElement, data: XWFlowBrandData, config: XWFlowBrandConfig = {}) {
    super(container, data, config);
    renderBrand(this.container, this.data, this.config);
  }
}
