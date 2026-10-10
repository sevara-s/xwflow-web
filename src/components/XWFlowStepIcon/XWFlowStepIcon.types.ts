import type { StepGroup } from "../../types/domain";

export interface XWFlowStepIconData {
  /** XWUI icon name. */
  icon: string;
  group: StepGroup;
}

export interface XWFlowStepIconConfig {
  size?: "sm" | "md";
  /** Ghost tiles tint the outline instead of filling the tile. */
  ghost?: boolean;
  className?: string;
}
