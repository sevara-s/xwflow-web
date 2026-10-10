import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowDiagram.css?inline";
import type { XWFlowDiagramConfig, XWFlowDiagramData, XWFlowDiagramEvents } from "./XWFlowDiagram.types";
import { renderDiagram } from "./XWFlowDiagram.view";

registerStyles("XWFlowDiagram", css);

/**
 * One flow drawn in a standard notation: an ISO 5807 flowchart, swimlanes
 * by system, a BPMN 2.0 collaboration, or a UML sequence built from a
 * real run receipt, where each numbered dot is a ledger row.
 */
export class XWFlowDiagram extends XWUIComponent<XWFlowDiagramData, XWFlowDiagramConfig> {
  static componentName = "XWFlowDiagram";

  private handlers: Partial<XWFlowDiagramEvents> = {};

  constructor(container: HTMLElement, data: XWFlowDiagramData, config: XWFlowDiagramConfig = {}) {
    super(container, data, config);
    this.render();
  }

  on<K extends keyof XWFlowDiagramEvents>(event: K, handler: XWFlowDiagramEvents[K]): void {
    this.handlers[event] = handler;
  }

  override setData(data: XWFlowDiagramData): void {
    super.setData(data);
    this.render();
  }

  /** The drawing as standalone SVG text, for export. */
  toSvg(): string {
    const svgNode = this.container.querySelector("svg");
    return svgNode ? new XMLSerializer().serializeToString(svgNode) : "";
  }

  private render(): void {
    renderDiagram(this.container, this.data, this.config, (id) => this.handlers.attempt?.(id));
  }
}
