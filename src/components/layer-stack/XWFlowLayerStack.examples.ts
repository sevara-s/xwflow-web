/**
 * XWFlowLayerStack examples, the way XWUI ships examples with each component.
 * Panels are elements, so each example names what goes on its layers and the
 * host builds them (in the app, XWUI notation thumbnails).
 */
import type { XWFlowLayerStackConfig, XWFlowLayerStackData } from './XWFlowLayerStack.types';

export interface XWFlowLayerStackExample {
  name: string;
  description: string;
  data: Omit<XWFlowLayerStackData, 'panels'>;
  config: XWFlowLayerStackConfig;
}

export const examples: XWFlowLayerStackExample[] = [
  {
    name: 'Three notations of one flow',
    description: 'The Notations hero: the flowchart lowest, BPMN in the middle, the node graph on top, each labelled at its side.',
    data: { label: 'One flow drawn three ways', layers: [{ label: 'Classic flowchart', hue: 'cyan' }, { label: 'BPMN 2.0', hue: 'orange' }, { label: 'Node graph', hue: 'lime' }] },
    config: {},
  },
  {
    name: 'Two layers, flatter',
    description: 'Fewer layers with a lower tilt and tighter spacing, for a smaller drawing.',
    data: { label: 'Draft and published', layers: [{ label: 'Draft', hue: 'violet' }, { label: 'Published', hue: 'lime' }] },
    config: { tiltX: 45, spacing: 110, viewHeight: 420 },
  },
];
