export interface Crumb {
  label: string;
  href?: string;
}

export interface XWFlowAppBarData {
  crumbs: Crumb[];
  /** Mono text after the crumbs, such as a run's short ID. */
  meta?: string;
  /** A dashed "sample" tag that marks illustrative data. */
  sampleTag?: string;
  /** Extra context tags, such as the tenant or the plan. */
  tags?: Array<{ label: string; color: "plain" | "lime" | "violet" }>;
  /** Hide the avatar, for screens that show the plan instead. */
  hideAccount?: boolean;
  accountLabel: string;
  accountName: string;
}

export type XWFlowAppBarConfig = { className?: string };
