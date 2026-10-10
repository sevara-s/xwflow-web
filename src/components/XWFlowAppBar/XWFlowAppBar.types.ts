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
  accountLabel: string;
  accountName: string;
}

export type XWFlowAppBarConfig = { className?: string };
