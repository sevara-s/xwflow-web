import { XWUIButton, XWUIComponent, XWUIDisplayStatusPill, XWUITypography } from "../../xwui";
import "./XWFlowStage.css";
import { initialZoom, nextZoom } from "./XWFlowStage.logic";
import type { XWFlowStageData } from "./XWFlowStage.types";
import { renderStage } from "./XWFlowStage.view";

export class XWFlowStage extends XWUIComponent {
  static componentName = "XWFlowStage";

  private stageData!: XWFlowStageData;
  private owned: Array<{ destroy(): void }> = [];
  private world: HTMLElement | null = null;
  private zoom = initialZoom();
  private playTimer = 0;

  constructor(container: HTMLElement, data: XWFlowStageData) {
    super(container, data);
    this.stageData = data;
    this.paint();
  }

  private paint(): void {
    this.clearOwned();
    const slots = renderStage(this.container, this.stageData);
    this.world = slots.world;
    this.applyZoom();
    const controls = this.stageData.controls;
    this.owned.push(
      mountCommand(slots.reset, controls.reset, () => this.setZoom(0)),
      mountCommand(slots.zoomOut, controls.zoomOut, () => this.setZoom(-1)),
      mountCommand(slots.zoomIn, controls.zoomIn, () => this.setZoom(1)),
      mountCommand(slots.run, controls.run, () => this.play()),
      new XWUIDisplayStatusPill(slots.draft, { label: this.stageData.prompt.badge, status: "success" }, { dot: false, size: "sm" }),
      new XWUIDisplayStatusPill(slots.sample, { label: this.stageData.receipt.sample, status: "neutral" }, { dot: false, size: "sm" }),
    );
    this.stageData.metrics.forEach((metric, index) => {
      const figure = slots.figures[index];
      const title = slots.titles[index];
      const detail = slots.details[index];
      if (!figure || !title || !detail) return;
      if (metric.figure) {
        this.owned.push(new XWUITypography(figure, { text: metric.figure, variant: "h2" }));
      }
      this.owned.push(
        new XWUITypography(title, { text: metric.title, variant: "h4" }),
        new XWUITypography(detail, { text: metric.detail, variant: "body" }),
      );
    });
    const kinds = [...this.stageData.kinds, ...this.stageData.kinds];
    kinds.forEach((kind, index) => {
      const host = slots.kinds[index];
      if (!host) return;
      this.owned.push(
        new XWUIDisplayStatusPill(host, { label: kind.label, variant: kind.tone }, { dot: false, size: "sm" }),
      );
    });
  }

  private setZoom(direction: -1 | 0 | 1): void {
    this.zoom = nextZoom(this.zoom, direction);
    this.applyZoom();
    if (direction === 0) this.play();
  }

  private applyZoom(): void {
    this.world?.style.setProperty("--xwflow-zoom", String(this.zoom));
  }

  private play(): void {
    this.container.classList.remove("is-playing");
    void this.container.offsetWidth;
    this.container.classList.add("is-playing");
    window.clearTimeout(this.playTimer);
    this.playTimer = window.setTimeout(() => this.container.classList.remove("is-playing"), 3200);
  }

  private clearOwned(): void {
    window.clearTimeout(this.playTimer);
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
