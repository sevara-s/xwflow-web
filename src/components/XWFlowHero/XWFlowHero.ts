import { XWUIButton, XWUIComponent } from "../../xwui";
import "./XWFlowHero.css";
import type { XWFlowHeroData } from "./XWFlowHero.types";
import { renderHero } from "./XWFlowHero.view";

export class XWFlowHero extends XWUIComponent {
  static componentName = "XWFlowHero";

  private heroData!: XWFlowHeroData;
  private owned: Array<{ destroy(): void }> = [];

  constructor(container: HTMLElement, data: XWFlowHeroData) {
    super(container, data);
    this.heroData = data;
    this.paint();
  }

  private paint(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    const slots = renderHero(this.container, this.heroData);
    const primary = new XWUIButton(
      slots.primary,
      { text: `${this.heroData.primaryLabel} ${this.heroData.primaryArrow}` },
      { shape: "pill", type: "button" },
    );
    primary.onClick((event) => {
      event.preventDefault();
      this.heroData.onPrimary();
    });
    const secondary = new XWUIButton(
      slots.secondary,
      { text: this.heroData.secondaryLabel },
      { shape: "pill", type: "button" },
    );
    secondary.onClick((event) => {
      event.preventDefault();
      this.heroData.onSecondary();
    });
    this.owned.push(primary, secondary);
  }

  override destroy(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    super.destroy();
  }
}
