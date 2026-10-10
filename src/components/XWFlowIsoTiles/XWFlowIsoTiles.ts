import { XWUIComponent } from "../../xwui";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowIsoTiles.css?inline";
import type { XWFlowIsoTilesConfig, XWFlowIsoTilesData } from "./XWFlowIsoTiles.types";
import { renderIsoTiles } from "./XWFlowIsoTiles.view";

registerStyles("XWFlowIsoTiles", css);

/** Services as lifted tiles on an isometric plane, coloured by state; failing ones pulse. */
export class XWFlowIsoTiles extends XWUIComponent<XWFlowIsoTilesData, XWFlowIsoTilesConfig> {
  static componentName = "XWFlowIsoTiles";

  constructor(container: HTMLElement, data: XWFlowIsoTilesData, config: XWFlowIsoTilesConfig = {}) {
    super(container, data, config);
    renderIsoTiles(this.container, this.data, this.config);
  }

  override setData(data: XWFlowIsoTilesData): void {
    super.setData(data);
    renderIsoTiles(this.container, this.data, this.config);
  }
}
