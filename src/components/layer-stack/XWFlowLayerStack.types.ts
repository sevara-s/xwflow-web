/** Headless schema types - safe for UI ports (no DOM imports). */
import type { XWUIComponentEventMap } from '../../xwui';

export type XWFlowLayerStackHue = 'lime' | 'cyan' | 'violet' | 'pink' | 'orange' | 'green' | 'amber' | 'red' | 'blue';

export interface XWFlowLayerStackLayer {
  label: string;
  hue?: XWFlowLayerStackHue;
}

export interface XWFlowLayerStackConfig {
  /** Plane tilt in degrees: rotateX, then rotateZ. */
  tiltX?: number;
  tiltZ?: number;
  /** Height between layers in pixels. */
  spacing?: number;
  /** Layer size in pixels before the tilt. */
  width?: number;
  height?: number;
  /** Height of the whole drawing in pixels. */
  viewHeight?: number;
  className?: string;
}

export interface XWFlowLayerStackData {
  /** Layers bottom first: the first lies lowest, the last floats on top. */
  layers?: XWFlowLayerStackLayer[];
  /** One element per layer, in the same order, drawn on the layer. */
  panels?: HTMLElement[];
  /** Spoken description of the drawing. */
  label?: string;
  uid?: string;
}

export type XWFlowLayerStackEventMap = XWUIComponentEventMap;
