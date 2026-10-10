import { describe, expect, it } from "vitest";
import { stackHeights } from "../src/components/XWFlowStackedBars/XWFlowStackedBars.logic";

describe("stacked bars", () => {
  it("scales the tallest stack to the chart and keeps small failures visible", () => {
    const heights = stackHeights([{ base: 90, alert: 10 }, { base: 49, alert: 1 }, { base: 0, alert: 0 }], 200);
    expect(heights[0]).toEqual({ base: 180, alert: 20 });
    expect(heights[1].alert).toBeGreaterThanOrEqual(1);
    expect(heights[2]).toEqual({ base: 0, alert: 0 });
  });
});
