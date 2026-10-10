import { XWUIButton, XWUIComponent, XWUITag } from "../../xwui";
import groupsCss from "../groups.css?inline";
import { registerStyles } from "../registerStyles";
import { XWFlowStatus } from "../XWFlowStatus/XWFlowStatus";
import { XWFlowStepIcon } from "../XWFlowStepIcon/XWFlowStepIcon";
import css from "./XWFlowConnectionCard.css?inline";
import type { XWFlowConnectionCardConfig, XWFlowConnectionCardData, XWFlowConnectionCardEvents } from "./XWFlowConnectionCard.types";
import { renderConnectionCard } from "./XWFlowConnectionCard.view";

registerStyles("XWFlowGroups", groupsCss);
registerStyles("XWFlowConnectionCard", css);

type Owned = { destroy(): void };

/**
 * A stored credential. It shows who owns it, what it may do, its health and
 * a masked value with no reveal control: secrets stay in the vault.
 */
export class XWFlowConnectionCard extends XWUIComponent<XWFlowConnectionCardData, XWFlowConnectionCardConfig> {
  static componentName = "XWFlowConnectionCard";

  private owned: Owned[] = [];
  private handlers: Partial<XWFlowConnectionCardEvents> = {};
  private button: XWUIButton | null = null;

  constructor(container: HTMLElement, data: XWFlowConnectionCardData, config: XWFlowConnectionCardConfig = {}) {
    super(container, data, config);
    this.render();
  }

  on<K extends keyof XWFlowConnectionCardEvents>(event: K, handler: XWFlowConnectionCardEvents[K]): void {
    this.handlers[event] = handler;
  }

  override setData(data: XWFlowConnectionCardData): void {
    super.setData(data);
    this.render();
  }

  private render(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    const { data } = this;
    const slots = renderConnectionCard(this.container, data, this.config);
    this.owned.push(new XWFlowStepIcon(slots.icon, { icon: data.icon, group: data.group }));
    this.owned.push(new XWFlowStatus(slots.status, data.status));
    data.tags.forEach((label, index) => {
      this.owned.push(new XWUITag(slots.tags[index], { label }, { size: "small", className: "xwflow-tag xwflow-tag--plain" }));
    });
    this.button = new XWUIButton(
      slots.action,
      { text: data.action.label },
      data.action.primary ? { variant: "primary", size: "sm" } : { variant: "ghost", size: "sm", className: "xwflow-btn-glass" },
    );
    this.button.onClick(async () => {
      const button = this.button;
      button?.setLoading?.(true);
      try {
        await this.handlers.action?.();
      } finally {
        button?.setLoading?.(false);
      }
    });
    this.owned.push(this.button);
  }

  override destroy(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    super.destroy();
  }
}
