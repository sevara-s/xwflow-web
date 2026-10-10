import { describe, expect, it } from "vitest";
import { cardSeverity, splitEmphasis } from "../src/components/XWFlowConnectionCard/XWFlowConnectionCard.logic";
import { gaugePercent } from "../src/components/XWFlowGauge/XWFlowGauge.logic";
import { isSearchShortcut, usagePercent } from "../src/components/XWFlowRail/XWFlowRail.logic";
import { barHeights } from "../src/components/XWFlowSparkBars/XWFlowSparkBars.logic";
import { axisEnd, layoutBars } from "../src/components/XWFlowWaterfall/XWFlowWaterfall.logic";
import type { WaterfallRow } from "../src/components/XWFlowWaterfall/XWFlowWaterfall.types";

const row = (id: string, startMs: number | null, durationMs: number | null): WaterfallRow => ({
  id,
  label: id,
  startMs,
  durationMs,
  caption: id,
  group: "integration",
});

describe("waterfall", () => {
  const rows = [row("a", 0, 840), row("b", 846, 212), row("c", 1061, 3), row("skip", null, null)];

  it("ends the axis at the last finish", () => {
    expect(axisEnd(rows)).toBe(1064);
  });

  it("places bars proportionally and leaves untimed rows empty", () => {
    const bars = layoutBars(rows);
    expect(bars[0]?.left).toBe(0);
    expect(bars[0]?.width).toBeCloseTo((840 / 1064) * 100);
    expect(bars[3]).toBeNull();
  });

  it("moves a caption before the bar when the bar ends near the edge", () => {
    const bars = layoutBars(rows);
    expect(bars[0]?.captionSide).toBe("left");
    expect(bars[1]?.captionSide).toBe("right");
  });

  it("gives instant steps a visible sliver", () => {
    expect(layoutBars(rows)[2]?.width).toBeGreaterThan(1);
  });
});

describe("small component logic", () => {
  it("fills the gauge as a share of the total", () => {
    expect(gaugePercent(3, 5)).toBe(60);
    expect(gaugePercent(7, 5)).toBe(100);
    expect(gaugePercent(1, 0)).toBe(0);
  });

  it("scales spark bars to the tallest one and keeps empty hours visible", () => {
    expect(barHeights([{ value: 10 }, { value: 5 }, { value: 0 }])).toEqual([1, 0.5, 0.06]);
  });

  it("clamps rail usage and recognises Ctrl K and Cmd K", () => {
    expect(usagePercent(0.38)).toBe(38);
    expect(usagePercent(1.4)).toBe(100);
    expect(isSearchShortcut(new KeyboardEventLike("k", { ctrlKey: true }) as unknown as KeyboardEvent)).toBe(true);
    expect(isSearchShortcut(new KeyboardEventLike("K", { metaKey: true }) as unknown as KeyboardEvent)).toBe(true);
    expect(isSearchShortcut(new KeyboardEventLike("k", {}) as unknown as KeyboardEvent)).toBe(false);
  });

  it("flags broken and expiring connections", () => {
    expect(cardSeverity("err")).toBe("bad");
    expect(cardSeverity("warn")).toBe("warn");
    expect(cardSeverity("ok")).toBe("ok");
  });

  it("splits a note around its emphasised words", () => {
    expect(splitEmphasis("Sign-in expired. Weekly digest fails.", "Weekly digest")).toEqual(["Sign-in expired. ", "Weekly digest", " fails."]);
    expect(splitEmphasis("No emphasis", "missing")).toEqual(["No emphasis", "", ""]);
  });
});

class KeyboardEventLike {
  ctrlKey = false;
  metaKey = false;
  altKey = false;
  constructor(
    public key: string,
    init: Partial<Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey">>,
  ) {
    Object.assign(this, init);
  }
}
