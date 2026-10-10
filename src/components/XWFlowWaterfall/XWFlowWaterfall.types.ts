import type { StepGroup } from "../../types/domain";

export interface WaterfallRow {
  id: string;
  label: string;
  /** Rows without timing (skipped, not run) show only their caption. */
  startMs: number | null;
  durationMs: number | null;
  caption: string;
  group: StepGroup;
  failed?: boolean;
  muted?: boolean;
}

export interface XWFlowWaterfallData {
  rows: WaterfallRow[];
  /** Spoken label for the whole chart. */
  label: string;
}

export interface XWFlowWaterfallConfig {
  /** Duration drawn when a step took no measurable time, as a share of the axis. */
  minShare?: number;
  className?: string;
}

export interface WaterfallBar {
  left: number;
  width: number;
  /** Where the caption sits, as a share of the track, and from which side. */
  captionAt: number;
  captionSide: "left" | "right";
}
