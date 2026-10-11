/**
 * The xwflow layer stack: panels on glowing planes, stacked in 3D (the
 * Notations hero). An XWUI-style component kept in this app because the
 * published XWUI basic tier has no layer stack: headless logic, a pure
 * projector, and this thin adapter on the published XWUIComponent.
 */
import { XWUIComponent } from "../../xwui";
import { renderInto } from "../view";
import { createXWFlowLayerStackLogic, type XWFlowLayerStackLogic } from "./XWFlowLayerStack.logic";
import type { XWFlowLayerStackConfig, XWFlowLayerStackData } from "./XWFlowLayerStack.types";
import { projectLayerStackView } from "./XWFlowLayerStack.view";
import "./XWFlowLayerStack.css";

export class XWFlowLayerStack extends XWUIComponent {
  static componentName = "XWFlowLayerStack";

  /** Its stylesheet ships with this app (imported above), not from xwui.dev. */
  protected loadComponentCSS(): void {}

  private readonly state: XWFlowLayerStackLogic;
  private unsubscribe?: () => void;
  private disposed = false;
  private root: HTMLElement | null = null;

  constructor(container: HTMLElement, data: XWFlowLayerStackData = {}, config: XWFlowLayerStackConfig = {}) {
    const logic = createXWFlowLayerStackLogic(data, config);
    super(container, logic as never);
    this.state = logic;
    this.unsubscribe = logic.subscribe(() => this.renderView());
    this.renderView();
  }

  /** Each panel element is placed on its own plane after the planes render. */
  private readonly panelRef = (index: number) => (element: HTMLElement | null): void => {
    const panel = this.state.getState().data.panels?.[index];
    if (element && panel && (element.firstChild !== panel || element.childNodes.length !== 1)) element.replaceChildren(panel);
  };

  private renderView(): void {
    if (this.disposed) return;
    const view = projectLayerStackView(this.state.getState(), { panelRef: this.panelRef });
    view.node.ref = (element) => (this.root = element);
    renderInto(this.container, view.node);
  }

  public setData(data: Partial<XWFlowLayerStackData>): void {
    if (!this.disposed) this.state.updateData(data);
  }

  public updateConfig(patch: Partial<XWFlowLayerStackConfig>): void {
    if (!this.disposed) this.state.updateConfig(patch);
  }

  public getElement(): HTMLElement | null {
    return this.root;
  }

  public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe?.();
    this.root = null;
    super.destroy();
  }
}
