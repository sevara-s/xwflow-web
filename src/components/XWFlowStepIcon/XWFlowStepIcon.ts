import { XWUIComponent, XWUIIcon } from "../../xwui";
import groupsCss from "../groups.css?inline";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowStepIcon.css?inline";
import type { XWFlowStepIconConfig, XWFlowStepIconData } from "./XWFlowStepIcon.types";
import { paintStepIcon } from "./XWFlowStepIcon.view";

registerStyles("XWFlowGroups", groupsCss);
registerStyles("XWFlowStepIcon", css);

/** The glowing tile that marks a step's group, with an XWUI icon inside. */
export class XWFlowStepIcon extends XWUIComponent<XWFlowStepIconData, XWFlowStepIconConfig> {
  static componentName = "XWFlowStepIcon";

  private icon: XWUIIcon | null = null;

  constructor(container: HTMLElement, data: XWFlowStepIconData, config: XWFlowStepIconConfig = {}) {
    super(container, data, config);
    this.render();
  }

  override setData(data: XWFlowStepIconData): void {
    super.setData(data);
    this.render();
  }

  private render(): void {
    this.icon?.destroy();
    const host = paintStepIcon(this.container, this.data, this.config);
    this.icon = new XWUIIcon(host, { name: this.data.icon }, { size: this.config.size === "sm" ? "xs" : "sm", decorative: true });
  }

  override destroy(): void {
    this.icon?.destroy();
    super.destroy();
  }
}
