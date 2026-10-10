import { XWUIButton, XWUIComponent } from "../../xwui";
import groupsCss from "../groups.css?inline";
import { registerStyles } from "../registerStyles";
import { XWFlowStatus } from "../XWFlowStatus/XWFlowStatus";
import { XWFlowStepIcon } from "../XWFlowStepIcon/XWFlowStepIcon";
import css from "./XWFlowCanvas.css?inline";
import { fitTransform, graphBounds, tidyLayout, zoomAt } from "./XWFlowCanvas.logic";
import type { CanvasInsets, Transform, XWFlowCanvasConfig, XWFlowCanvasData, XWFlowCanvasEvents } from "./XWFlowCanvas.types";
import { renderCanvas, type CanvasSlots } from "./XWFlowCanvas.view";

registerStyles("XWFlowGroups", groupsCss);
registerStyles("XWFlowCanvas", css);

type Owned = { destroy(): void };

const DEFAULT_WIDTH = 210;
const DRAG_THRESHOLD = 4;
let sequence = 0;

/**
 * The flow canvas. It draws steps as cards wired output to input, with
 * frames and sticky notes. Editable canvases support selecting, dragging,
 * wheel and button zoom, fit, tidy up and a minimap; read-only canvases
 * only fit and display.
 */
export class XWFlowCanvas extends XWUIComponent<XWFlowCanvasData, XWFlowCanvasConfig> {
  static componentName = "XWFlowCanvas";

  private owned: Owned[] = [];
  private slots!: CanvasSlots;
  private transform: Transform = { x: 0, y: 0, scale: 1 };
  private handlers: Partial<XWFlowCanvasEvents> = {};
  private fitted = false;
  private readonly uid = String(++sequence);
  private readonly resize = new ResizeObserver(() => {
    if (!this.fitted) this.fit();
  });

  constructor(container: HTMLElement, data: XWFlowCanvasData, config: XWFlowCanvasConfig = {}) {
    super(container, data, config);
    this.container.dataset.uid = this.uid;
    this.render();
    this.resize.observe(this.container);
  }

  on<K extends keyof XWFlowCanvasEvents>(event: K, handler: XWFlowCanvasEvents[K]): void {
    this.handlers[event] = handler;
  }

  private get nodeWidth(): number {
    return this.config.nodeWidth ?? DEFAULT_WIDTH;
  }

  private get insets(): CanvasInsets {
    return { top: 0, right: 0, bottom: 0, left: 0, ...this.config.insets };
  }

  override setData(data: XWFlowCanvasData): void {
    super.setData(data);
    this.render();
  }

  /** Highlight a node without redrawing the graph. */
  select(nodeId: string | null): void {
    this.data.selectedId = nodeId;
    for (const [id, slot] of this.slots.nodes) slot.card.setAttribute("aria-pressed", String(id === nodeId));
  }

  fit(): void {
    const { clientWidth, clientHeight } = this.container;
    if (!clientWidth || !clientHeight) return;
    this.fitted = true;
    this.apply(fitTransform(graphBounds(this.data.graph, this.nodeWidth), clientWidth, clientHeight, this.insets, this.config.maxFitScale ?? 1));
  }

  zoom(factor: number): void {
    const { clientWidth, clientHeight } = this.container;
    const cx = this.insets.left + (clientWidth - this.insets.left - this.insets.right) / 2;
    const cy = this.insets.top + (clientHeight - this.insets.top - this.insets.bottom) / 2;
    this.apply(zoomAt(this.transform, factor, cx, cy));
  }

  private apply(transform: Transform): void {
    this.transform = transform;
    this.slots.stage.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  }

  private render(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    this.slots = renderCanvas(this.container, this.data, this.config, this.nodeWidth);
    for (const node of this.data.graph.nodes) {
      const slot = this.slots.nodes.get(node.id);
      const view = this.data.views[node.id];
      if (!slot || !view) continue;
      this.owned.push(new XWFlowStepIcon(slot.icon, { icon: view.icon, group: node.group }, { size: "sm" }));
      if (slot.status && view.status) this.owned.push(new XWFlowStatus(slot.status, view.status, { size: "sm" }));
    }
    this.mountTools();
    this.bindPointer();
    if (this.fitted) this.apply(this.transform);
    else this.fit();
  }

  private mountTools(): void {
    const host = this.slots.tools;
    if (!host) return;
    const { labels } = this.data;
    const tools: Array<[string, string, () => void]> = [
      ["zoom-out", labels.zoomOut, () => this.zoom(1 / 1.2)],
      ["zoom-in", labels.zoomIn, () => this.zoom(1.2)],
      ["maximize", labels.fit, () => this.fit()],
      ["layout-grid", labels.tidy, () => this.handlers.tidy?.(tidyLayout(this.data.graph, this.nodeWidth))],
    ];
    for (const [icon, label, action] of tools) {
      const slot = document.createElement("span");
      host.append(slot);
      const button = new XWUIButton(slot, { text: "" }, { variant: "ghost", size: "sm", icon, ariaLabel: label, title: label });
      button.onClick(action);
      this.owned.push(button);
    }
  }

  private bindPointer(): void {
    const { viewport } = this.slots;
    const readOnly = Boolean(this.config.readOnly);

    viewport.addEventListener("click", (event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(".xwflow-canvas__node");
      if (card?.dataset.id && !card.dataset.dragged) this.handlers.select?.(card.dataset.id);
      if (card) delete card.dataset.dragged;
    });
    if (readOnly) return;

    viewport.addEventListener(
      "wheel",
      (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const rect = this.container.getBoundingClientRect();
        this.apply(zoomAt(this.transform, event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - rect.left, event.clientY - rect.top));
      },
      { passive: false },
    );

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const card = (event.target as HTMLElement).closest<HTMLElement>(".xwflow-canvas__node");
      const start = { x: event.clientX, y: event.clientY };
      const node = card ? this.data.graph.nodes.find((item) => item.id === card.dataset.id) : undefined;
      const origin = node ? { x: node.x, y: node.y } : { x: this.transform.x, y: this.transform.y };
      let moved = false;
      viewport.setPointerCapture(event.pointerId);
      if (!card) viewport.dataset.panning = "";

      const onMove = (move: PointerEvent): void => {
        const dx = move.clientX - start.x;
        const dy = move.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        moved = true;
        if (node && card) {
          node.x = Math.round(origin.x + dx / this.transform.scale);
          node.y = Math.round(origin.y + dy / this.transform.scale);
          card.style.left = `${node.x}px`;
          card.style.top = `${node.y}px`;
        } else {
          this.apply({ ...this.transform, x: origin.x + dx, y: origin.y + dy });
        }
      };
      const onUp = (): void => {
        viewport.removeEventListener("pointermove", onMove);
        viewport.removeEventListener("pointerup", onUp);
        viewport.removeEventListener("pointercancel", onUp);
        delete viewport.dataset.panning;
        if (moved && node && card) {
          card.dataset.dragged = "true";
          this.handlers.move?.(node.id, node.x, node.y);
          this.render();
        }
      };
      viewport.addEventListener("pointermove", onMove);
      viewport.addEventListener("pointerup", onUp);
      viewport.addEventListener("pointercancel", onUp);
    });
  }

  override destroy(): void {
    this.resize.disconnect();
    for (const item of this.owned.splice(0)) item.destroy();
    super.destroy();
  }
}
