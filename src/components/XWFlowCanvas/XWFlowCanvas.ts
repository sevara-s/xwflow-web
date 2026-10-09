import { XWUIComponent } from "../../xwui";
import "./XWFlowCanvas.css";
import { projectCanvas } from "./XWFlowCanvas.logic";
import type { XWFlowCanvasData } from "./XWFlowCanvas.types";
import { renderCanvas } from "./XWFlowCanvas.view";

export class XWFlowCanvas extends XWUIComponent {
  static componentName = "XWFlowCanvas";

  private canvasData!: XWFlowCanvasData;

  constructor(container: HTMLElement, data: XWFlowCanvasData) {
    super(container, data);
    this.canvasData = data;
    this.paint();
  }

  setData(data: object): void {
    super.setData(data);
    this.canvasData = data as XWFlowCanvasData;
    this.paint();
  }

  private paint(): void {
    renderCanvas(this.container, projectCanvas(this.canvasData), (stepId) => {
      this.canvasData.onSelect(stepId);
    });
  }
}
