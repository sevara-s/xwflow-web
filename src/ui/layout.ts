/**
 * Layout presets: the widths, column splits and breakpoints pages lay out
 * with, named by what they hold. Pages name a preset and never carry the
 * number; spacing lives in the theme's --space-* tokens and decorations in
 * decor.ts. The values follow the prototype's boards.
 */

/** The narrowest a card may get in an auto-fit grid, in pixels, by what the grid holds. */
export const cardWidths = {
  /** Assistant starter chips. */
  starter: 150,
  /** Small facts and upload slots (branding, denied, simulation figures). */
  small: 160,
  /** KPI cards in a page head. */
  kpi: 200,
  /** KPI cards in a narrower column (admin overview, agents, forms). */
  kpiCompact: 210,
  /** Feature tiles and mode tiles. */
  tile: 220,
  /** Standard cards: adapters, workers, integrations, stats. */
  card: 230,
  /** Health checks. */
  check: 250,
  /** Gallery cards: notations, recommended flows, pricing tiers. */
  gallery: 300,
  /** Form and template cards. */
  template: 320,
  /** Agent and MCP server cards. */
  agent: 340,
  /** Connection cards. */
  connection: 360,
  /** The pricing contact form beside its pitch. */
  contact: 380,
  /** Two panels side by side. */
  half: 440,
} as const;

export type CardWidth = keyof typeof cardWidths;

/** Column templates for XWUIGrid, by how the space is split. */
export const columns = {
  /** One column (phones, and the start of every responsive split). */
  one: "minmax(0, 1fr)",
  /** Two equal columns. */
  halves: "repeat(2, minmax(0, 1fr))",
  /** Two equal columns, written out (a fixed split). */
  oneOne: "minmax(0, 1fr) minmax(0, 1fr)",
  /** A wide main column and a side column. */
  twoOne: "minmax(0, 2fr) minmax(0, 1fr)",
  /** A side column and a wide main column. */
  oneTwo: "minmax(0, 1fr) minmax(0, 2fr)",
  /** A main column a little wider than its side. */
  threeTwo: "minmax(0, 3fr) minmax(0, 2fr)",
  /** A column sized to its content, then the rest. */
  startRest: "auto minmax(0, 1fr)",
  /** Content-sized ends around a flexible middle (a toolbar). */
  toolbar: "auto minmax(0, 1fr) auto",
  /** A fixed label column, then the value. */
  labelValue: "110px minmax(0, 1fr)",
} as const;

/** The widest a page's content gets, in pixels. */
export const pageMax = 1280;

/** Readable widths for centred content, in pixels. */
export const measures = {
  /** Running text and leads. */
  text: 720,
  /** A search field under a hero. */
  search: 680,
  /** A panel under a centred title (the denied screen). */
  panel: 760,
  /** The assistant's prompt and starters. */
  prompt: 860,
} as const;

export type Measure = keyof typeof measures;

/** Media queries for layout that changes with the screen. */
export const breakpoints = {
  /** Phones: decorations step aside, timelines use their compact layout. */
  phone: "(max-width: 640px)",
  /** Below this the rails start collapsed. */
  tablet: "(max-width: 860px)",
  /** At or below this the published XWUIWorkbench stacks its panels under the stage. */
  workbench: "(max-width: 1100px)",
} as const;
