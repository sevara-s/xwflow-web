/**
 * The xwflow notation diagram: flowchart, swimlane, BPMN, sequence and
 * simulation drawings of one flow. Kept in this app because the published
 * XWUI basic tier ships an earlier diagram without start and end terminators,
 * retry loops, fixed columns and rows, or the filled block notation the
 * simulation uses. Headless logic, a pure projector, and this thin adapter on
 * the published XWUIComponent.
 */
import { XWUIComponent } from "../../xwui";
import { renderInto } from "../view";
import { createXWFlowNotationDiagramLogic, type XWFlowNotationDiagramLogic } from "./XWFlowNotationDiagram.logic";
import type { XWFlowNotationDiagramConfig, XWFlowNotationDiagramData } from "./XWFlowNotationDiagram.types";
import { projectNotationDiagramView } from "./XWFlowNotationDiagram.view";
import "./XWFlowNotationDiagram.css";

export class XWFlowNotationDiagram extends XWUIComponent {
  static componentName = "XWFlowNotationDiagram";

  /** Its stylesheet ships with this app (imported above), not from xwui.dev. */
  protected loadComponentCSS(): void {}

  private readonly state: XWFlowNotationDiagramLogic;
  private unsubscribe?: () => void;
  private disposed = false;
  private root: HTMLElement | null = null;

  constructor(container: HTMLElement, data: XWFlowNotationDiagramData = {}, config: XWFlowNotationDiagramConfig = {}) {
    const logic = createXWFlowNotationDiagramLogic(data, config);
    super(container, logic as never);
    this.state = logic;
    this.unsubscribe = logic.subscribe(() => this.renderView());
    this.renderView();
  }

  private renderView(): void {
    if (this.disposed) return;
    const view = projectNotationDiagramView(this.state.getState(), { onSelect: (id) => this.state.select(id) });
    view.node.ref = (element) => (this.root = element);
    renderInto(this.container, view.node);
  }

  public setData(data: Partial<XWFlowNotationDiagramData>): void {
    if (!this.disposed) this.state.updateData(data);
  }

  public updateConfig(patch: Partial<XWFlowNotationDiagramConfig>): void {
    if (!this.disposed) this.state.updateConfig(patch);
  }

  /** Mark a sequence row as chosen; emits select. */
  public select(id: string): void {
    if (!this.disposed) this.state.select(id);
  }

  /** Listen for a chosen sequence row. */
  public on(event: "select", handler: (detail: { id: string }) => void): () => void {
    return this.state.on(event, ((e: Event) => handler((e as CustomEvent<{ id: string }>).detail)) as never);
  }

  /** The drawing as standalone SVG text, for export. */
  public toSvg(): string {
    const svg = this.root?.querySelector("svg");
    if (!svg) return "";
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(copy);
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
