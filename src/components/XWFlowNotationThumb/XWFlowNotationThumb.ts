import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowNotationThumb.css?inline";
import type { XWFlowNotationThumbConfig, XWFlowNotationThumbData } from "./XWFlowNotationThumb.types";
import { renderThumb } from "./XWFlowNotationThumb.view";

registerStyles("XWFlowNotationThumb", css);

/** A small drawing of the sample flow in one notation: BPMN, sequence, Petri net and so on. */
export class XWFlowNotationThumb extends XWUIComponent<XWFlowNotationThumbData, XWFlowNotationThumbConfig> {
  static componentName = "XWFlowNotationThumb";

  constructor(container: HTMLElement, data: XWFlowNotationThumbData, config: XWFlowNotationThumbConfig = {}) {
    super(container, data, config);
    renderThumb(this.container, this.data, this.config);
  }
}
