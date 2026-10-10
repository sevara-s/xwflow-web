import type { SparkBar } from "./XWFlowSparkBars.types";

/** Heights as a share of the tallest bar; empty bars keep a sliver so the axis reads. */
export function barHeights(bars: SparkBar[]): number[] {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return bars.map((bar) => Math.max(0.06, bar.value / max));
}
