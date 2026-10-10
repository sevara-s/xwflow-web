import type { WaterfallBar, WaterfallRow } from "./XWFlowWaterfall.types";

/** The axis end: the latest moment any step finished, never zero. */
export function axisEnd(rows: WaterfallRow[]): number {
  const ends = rows.map((row) => (row.startMs ?? 0) + (row.durationMs ?? 0));
  return Math.max(1, ...ends);
}

/**
 * Position each bar on a 0 to 100 track. Captions go after the bar when it
 * ends early enough, otherwise before it, so labels never run off the edge.
 */
export function layoutBars(rows: WaterfallRow[], minShare = 0.012): Array<WaterfallBar | null> {
  const end = axisEnd(rows);
  return rows.map((row) => {
    if (row.startMs === null) return null;
    const left = (row.startMs / end) * 100;
    const width = Math.max(minShare * 100, ((row.durationMs ?? 0) / end) * 100);
    const right = left + width;
    if (right <= 80) return { left, width, captionAt: right + 2, captionSide: "left" };
    return { left, width, captionAt: 100 - left + 2, captionSide: "right" };
  });
}
