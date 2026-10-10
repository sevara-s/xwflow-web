import type { StatusTone } from "../../types/domain";

export interface XWFlowStatusData {
  tone: StatusTone;
  label: string;
}

export interface XWFlowStatusConfig {
  /** `sm` for dense tables and canvas nodes. */
  size?: "sm" | "md";
  className?: string;
}
