import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import { XWFlowCanvas } from "../XWFlowCanvas/XWFlowCanvas";
import css from "./XWFlowScene3D.css?inline";
import { clampTilt, clampZoom, nodeDepth } from "./XWFlowScene3D.logic";
import type { XWFlowScene3DConfig, XWFlowScene3DData } from "./XWFlowScene3D.types";
import { renderScene, type SceneSlots } from "./XWFlowScene3D.view";

registerStyles("XWFlowScene3D", css);

/**
 * A flow lifted into 3D: an XWFlowCanvas laid on a tilted, glowing floor,
 * with each step hovering at its own depth. Optional orbit by dragging,
 * and zoom from the page's own controls.
 */
export class XWFlowScene3D extends XWUIComponent<XWFlowScene3DData, XWFlowScene3DConfig> {
  static componentName = "XWFlowScene3D";

  private canvas: XWFlowCanvas | null = null;
  private slots!: SceneSlots;
  private tilt: { x: number; z: number };
  private zoomLevel = 1;

  constructor(container: HTMLElement, data: XWFlowScene3DData, config: XWFlowScene3DConfig = {}) {
    super(container, data, config);
    this.tilt = config.tilt ?? { x: 54, z: -26 };
    this.render();
    if (config.orbit) this.bindOrbit();
  }

  override setData(data: XWFlowScene3DData): void {
    super.setData(data);
    this.canvas?.setData(data);
    this.applyDepth();
  }

  zoom(factor: number): void {
    this.zoomLevel = clampZoom(this.zoomLevel * factor);
    this.container.style.setProperty("--xwflow-scene-zoom", String(this.zoomLevel));
  }

  reset(): void {
    this.zoomLevel = 1;
    this.tilt = this.config.tilt ?? { x: 54, z: -26 };
    this.applyTransform();
  }

  private render(): void {
    const width = this.config.width ?? 1040;
    const height = this.config.height ?? 560;
    this.slots = renderScene(this.container, this.data.labels.canvas, width, height, this.config.ring ?? true, this.config.className, this.config.lanes);
    this.canvas?.destroy();
    this.slots.canvas.style.width = `${width}px`;
    this.slots.canvas.style.height = `${height}px`;
    this.canvas = new XWFlowCanvas(this.slots.canvas, this.data, { readOnly: true, nodeWidth: this.config.nodeWidth ?? 190, maxFitScale: 1.2 });
    this.applyTransform();
    this.applyDepth();
  }

  private applyTransform(): void {
    const style = this.container.style;
    style.setProperty("--xwflow-scene-x", `${this.tilt.x}deg`);
    style.setProperty("--xwflow-scene-z", `${this.tilt.z}deg`);
    style.setProperty("--xwflow-scene-zoom", String(this.zoomLevel));
  }

  private applyDepth(): void {
    const cards = [...this.container.querySelectorAll<HTMLElement>(".xwflow-canvas__node")];
    cards.forEach((card, index) => {
      const depth = card.dataset.id ? this.data.depths?.[card.dataset.id] : undefined;
      card.style.setProperty("--xwflow-z", `${depth ?? nodeDepth(index, cards.length)}px`);
      card.style.animationDelay = `${-1.5 * index}s`;
    });
  }

  private bindOrbit(): void {
    const host = this.container;
    host.dataset.orbit = "";
    host.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const start = { x: event.clientX, y: event.clientY, tilt: { ...this.tilt } };
      host.setPointerCapture(event.pointerId);
      host.dataset.orbiting = "";
      const move = (next: PointerEvent): void => {
        this.tilt = clampTilt({ x: start.tilt.x - (next.clientY - start.y) / 6, z: start.tilt.z + (next.clientX - start.x) / 5 });
        this.applyTransform();
      };
      const up = (): void => {
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerup", up);
        delete host.dataset.orbiting;
      };
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerup", up);
    });
  }

  override destroy(): void {
    this.canvas?.destroy();
    super.destroy();
  }
}
