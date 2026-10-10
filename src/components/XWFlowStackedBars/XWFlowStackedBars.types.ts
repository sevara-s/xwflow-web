export interface StackedBar {
  /** The healthy part, drawn as the gradient column. */
  base: number;
  /** The alarming part, drawn red on top. */
  alert: number;
}

export interface XWFlowStackedBarsData {
  bars: StackedBar[];
  label: string;
  /** Captions under the first and last bar. */
  start: string;
  end: string;
}

export interface XWFlowStackedBarsConfig {
  height?: number;
  className?: string;
}
