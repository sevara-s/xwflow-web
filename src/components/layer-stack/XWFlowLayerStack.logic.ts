/**
 * Headless LayerStack: state and pure helpers.
 */
import { XWUIComponentLogic, type ComponentSchema } from '../../xwui';
import schema from './XWFlowLayerStack.json';
import type { XWFlowLayerStackConfig, XWFlowLayerStackData, XWFlowLayerStackEventMap } from './XWFlowLayerStack.types';


export class XWFlowLayerStackLogic extends XWUIComponentLogic<XWFlowLayerStackData, XWFlowLayerStackConfig, XWFlowLayerStackEventMap> {
  constructor(data: XWFlowLayerStackData = {}, config: XWFlowLayerStackConfig = {}) {
    super(schema as ComponentSchema, data, config);
  }
}

export function createXWFlowLayerStackLogic(data: XWFlowLayerStackData = {}, config: XWFlowLayerStackConfig = {}) {
  return new XWFlowLayerStackLogic(data, config);
}
