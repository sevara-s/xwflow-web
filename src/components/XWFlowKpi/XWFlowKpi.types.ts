export type KpiTone = "violet" | "cyan" | "red" | "amber" | "lime" | "green";

export interface XWFlowKpiData {
  label: string;
  value: number;
  /** Small print under the value, such as "as of 12 s ago". */
  note?: string;
}

export interface XWFlowKpiConfig {
  /** Colour of the glow in the corner. */
  tone?: KpiTone;
  /** Colour the number itself, for alarming values. */
  emphasis?: boolean;
  className?: string;
}
