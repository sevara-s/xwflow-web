export type ShapeKind = "orb" | "ring" | "cube" | "halo";

export interface XWFlowShapeData {
  kind: ShapeKind;
}

export interface XWFlowShapeConfig {
  /** Edge length or diameter in pixels. */
  size?: number;
  /** Any xwflow palette name: lime, cyan, violet, pink, orange. */
  color?: "lime" | "cyan" | "violet" | "pink" | "orange";
  /** Ring thickness in pixels. */
  thickness?: number;
  /** Absolute placement inside a positioned parent, as CSS lengths. */
  place?: Partial<Record<"top" | "right" | "bottom" | "left", string>>;
  /** Stop animating, for small or repeated shapes. */
  still?: boolean;
  className?: string;
}
