/**
 * Headless notation diagram: its data, config and the selected sequence row.
 * The geometry every notation shares is in XWFlowNotationDiagram.layout.ts.
 */
import { XWUIComponentLogic, type ComponentSchema } from '../../xwui';
import schema from './XWFlowNotationDiagram.json';
import type { XWFlowNotationDiagramConfig, XWFlowNotationDiagramData, XWFlowNotationDiagramEventMap } from './XWFlowNotationDiagram.types';


export class XWFlowNotationDiagramLogic extends XWUIComponentLogic<XWFlowNotationDiagramData, XWFlowNotationDiagramConfig, XWFlowNotationDiagramEventMap> {
  constructor(data: XWFlowNotationDiagramData = {}, config: XWFlowNotationDiagramConfig = {}) {
    super(schema as ComponentSchema, data, config);
  }

  /** Mark a sequence row and announce it. */
  select(id: string): void {
    if (!(this.data.messages ?? []).some((message) => message.id === id)) return;
    this.updateData({ selectedMessage: id });
    this.emit('select', { id });
  }
}

export function createXWFlowNotationDiagramLogic(data: XWFlowNotationDiagramData = {}, config: XWFlowNotationDiagramConfig = {}) {
  return new XWFlowNotationDiagramLogic(data, config);
}
