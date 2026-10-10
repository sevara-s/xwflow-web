export interface XWFlowGaugeData {
  value: number;
  total: number;
  /** Word under the number, e.g. "recorded". */
  caption: string;
  /** Spoken label, e.g. "3 of 5 steps recorded". */
  label: string;
}

export interface XWFlowGaugeConfig {
  tone?: "green" | "red" | "cyan";
  size?: number;
  className?: string;
}
