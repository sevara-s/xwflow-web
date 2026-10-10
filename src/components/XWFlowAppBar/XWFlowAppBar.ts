import { XWUIAvatar, XWUIComponent, XWUITag } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowAppBar.css?inline";
import type { XWFlowAppBarConfig, XWFlowAppBarData } from "./XWFlowAppBar.types";
import { renderAppBar } from "./XWFlowAppBar.view";

registerStyles("XWFlowAppBar", css);

type Owned = { destroy(): void };

/** The Studio page header: breadcrumbs, page actions and the account. */
export class XWFlowAppBar extends XWUIComponent<XWFlowAppBarData, XWFlowAppBarConfig> {
  static componentName = "XWFlowAppBar";

  private owned: Owned[] = [];
  private actionSlot!: HTMLElement;

  constructor(container: HTMLElement, data: XWFlowAppBarData, config: XWFlowAppBarConfig = {}) {
    super(container, data, config);
    this.render();
  }

  /** Where the page mounts its buttons. Cleared on every setData. */
  get actions(): HTMLElement {
    return this.actionSlot;
  }

  override setData(data: XWFlowAppBarData): void {
    super.setData(data);
    this.render();
  }

  private render(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    const slots = renderAppBar(this.container, this.data, this.config);
    this.actionSlot = slots.actions;
    if (slots.sample && this.data.sampleTag) {
      this.owned.push(new XWUITag(slots.sample, { label: this.data.sampleTag }, { size: "small" }));
    }
    (this.data.tags ?? []).forEach((tag, index) => {
      this.owned.push(new XWUITag(slots.tags[index], { label: tag.label }, { size: "small", className: `xwflow-tag xwflow-tag--${tag.color}` }));
    });
    if (slots.avatar) {
      this.owned.push(
        new XWUIAvatar(slots.avatar, { name: this.data.accountName, alt: this.data.accountLabel }, { size: "small", ariaLabel: this.data.accountLabel }),
      );
    }
  }

  override destroy(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    super.destroy();
  }
}
