export type KpiTone = "violet" | "cyan" | "red" | "amber" | "lime" | "green" | "pink";

export interface XWFlowKpiData {
  label: string;
  /** null when the value was not recorded; `emptyLabel` shows instead. */
  value: number | null;
  emptyLabel?: string;
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
