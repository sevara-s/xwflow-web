import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowShape.css?inline";
import type { XWFlowShapeConfig, XWFlowShapeData } from "./XWFlowShape.types";
import { renderShape } from "./XWFlowShape.view";

registerStyles("XWFlowShape", css);

/** Decorative depth: a glowing orb, a gradient ring, a glass cube or a soft halo. Hidden from assistive technology. */
export class XWFlowShape extends XWUIComponent<XWFlowShapeData, XWFlowShapeConfig> {
  static componentName = "XWFlowShape";

  constructor(container: HTMLElement, data: XWFlowShapeData, config: XWFlowShapeConfig = {}) {
    super(container, data, config);
    renderShape(this.container, this.data, this.config);
  }
}
