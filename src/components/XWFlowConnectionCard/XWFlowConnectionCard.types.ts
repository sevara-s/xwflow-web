import type { StatusTone, StepGroup } from "../../types/domain";

export interface XWFlowConnectionCardData {
  name: string;
  /** "OAuth, owned by You" */
  subtitle: string;
  icon: string;
  group: StepGroup;
  status: { tone: StatusTone; label: string };
  /** The masked value. The real secret never reaches the browser. */
  mask: string;
  maskLabel: string;
  /** Body text; `emphasis` is drawn bold where it appears in `text`. */
  note: { text: string; emphasis?: string; muted: boolean };
  tags: string[];
  action: { label: string; primary: boolean };
}

export interface XWFlowConnectionCardConfig {
  className?: string;
}

export interface XWFlowConnectionCardEvents {
  action: () => Promise<void> | void;
}
