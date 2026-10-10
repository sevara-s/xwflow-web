import type { StepGroup } from "../../types/domain";

export interface XWFlowChainData {
  groups: StepGroup[];
  /** Read by assistive technology in place of the dots. */
  label: string;
}

export type XWFlowChainConfig = { className?: string };
