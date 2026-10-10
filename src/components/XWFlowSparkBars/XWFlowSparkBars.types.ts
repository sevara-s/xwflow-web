export interface SparkBar {
  value: number;
  /** Bars that contain a failure are drawn red. */
  alert?: boolean;
}

export interface XWFlowSparkBarsData {
  bars: SparkBar[];
  /** Spoken summary; the bars themselves are decorative. */
  label: string;
}

export interface XWFlowSparkBarsConfig {
  height?: number;
  className?: string;
}
