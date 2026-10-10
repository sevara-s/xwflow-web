import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowStatus.css?inline";
import type { XWFlowStatusConfig, XWFlowStatusData } from "./XWFlowStatus.types";
import { renderStatus } from "./XWFlowStatus.view";

registerStyles("XWFlowStatus", css);

/**
 * A run or step state: a shaped glyph plus words. The shape carries the
 * meaning as well as the colour (diamond for a failure, triangle for a
 * warning, spinner while running), so it reads without colour vision.
 */
export class XWFlowStatus extends XWUIComponent<XWFlowStatusData, XWFlowStatusConfig> {
  static componentName = "XWFlowStatus";

  constructor(container: HTMLElement, data: XWFlowStatusData, config: XWFlowStatusConfig = {}) {
    super(container, data, config);
    this.render();
  }

  override setData(data: XWFlowStatusData): void {
    super.setData(data);
    this.render();
  }

  override updateData(partial: Partial<XWFlowStatusData>): void {
    super.updateData(partial);
    this.render();
  }

  private render(): void {
    renderStatus(this.container, this.data, this.config);
  }
}
