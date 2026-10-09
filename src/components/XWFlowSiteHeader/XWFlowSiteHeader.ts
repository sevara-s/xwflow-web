import { XWUIButton, XWUIComponent } from "../../xwui";
import "./XWFlowSiteHeader.css";
import { projectHeader } from "./XWFlowSiteHeader.logic";
import type { XWFlowSiteHeaderData } from "./XWFlowSiteHeader.types";
import { renderSiteHeader } from "./XWFlowSiteHeader.view";

export class XWFlowSiteHeader extends XWUIComponent {
  static componentName = "XWFlowSiteHeader";

  private headerData!: XWFlowSiteHeaderData;
  private owned: Array<{ destroy(): void }> = [];

  constructor(container: HTMLElement, data: XWFlowSiteHeaderData) {
    super(container, data);
    this.headerData = data;
    this.paint();
  }

  setLanguageLabel(label: string): void {
    this.headerData = { ...this.headerData, languageLabel: label };
    this.paint();
  }

  private paint(): void {
    this.clearOwned();
    const slots = renderSiteHeader(this.container, projectHeader(this.headerData));
    this.owned.push(
      mountCommand(slots.language, this.headerData.languageLabel, () => this.headerData.onLanguage()),
      mountCommand(slots.signIn, this.headerData.signInLabel, () => this.headerData.onSignIn()),
      mountCommand(slots.start, this.headerData.startLabel, () => this.headerData.onStart()),
    );
  }

  private clearOwned(): void {
    for (const item of this.owned.splice(0)) item.destroy();
  }

  override destroy(): void {
    this.clearOwned();
    super.destroy();
  }
}

function mountCommand(host: HTMLElement, text: string, onClick: () => void): XWUIButton {
  const button = new XWUIButton(host, { text }, { shape: "pill", type: "button" });
  button.onClick((event) => {
    event.preventDefault();
    onClick();
  });
  return button;
}
