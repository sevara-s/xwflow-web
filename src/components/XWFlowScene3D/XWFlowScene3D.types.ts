import type { XWFlowCanvasData } from "../XWFlowCanvas/XWFlowCanvas.types";

export type XWFlowScene3DData = XWFlowCanvasData;

export interface XWFlowScene3DConfig {
  /** Plane size in pixels before the tilt. */
  width?: number;
  height?: number;
  /** Tilt of the plane: rotateX then rotateZ, in degrees. */
  tilt?: { x: number; z: number };
  /** Card width of the floating steps. */
  nodeWidth?: number;
  /** Draw the gradient ring under the middle of the flow. */
  ring?: boolean;
  /** Let people orbit the scene by dragging. */
  orbit?: boolean;
  className?: string;
}
