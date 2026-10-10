import type { StackedBar } from "./XWFlowStackedBars.types";

/** Heights in pixels for each part, scaled so the tallest stack fills the chart. */
export function stackHeights(bars: StackedBar[], height: number): Array<{ base: number; alert: number }> {
  const max = Math.max(1, ...bars.map((bar) => bar.base + bar.alert));
  return bars.map((bar) => ({
    base: Math.round((bar.base / max) * height),
    alert: bar.alert > 0 ? Math.max(1, Math.round((bar.alert / max) * height)) : 0,
  }));
}
