/**
 * The prototype's visual vocabulary as XWUI composer nodes.
 *
 * Every function returns data for XWUIComposer: which XWUI component, with
 * which data and config. Nothing here touches the DOM or ships CSS; colours,
 * glass and glows come from the xwflow XWUI theme, and the type scale below
 * is the prototype's own (xw.css).
 */
import { xwflowComponents, type XWFlowComponentName } from "../components";
import { decorations, type Decoration, type DecorationName } from "./decor";
import { cardWidths, measures, pageMax, type CardWidth, type Measure } from "./layout";
import { XWUIComposer, type XWUIComposerNode } from "../xwui";

export type Node = XWUIComposerNode;
export type Hue = "lime" | "cyan" | "violet" | "pink" | "orange" | "green" | "amber" | "red" | "blue";
/**
 * A step of the xwflow brand's spacing scale (4, 8, 12, 16, 24, 32, 48 on a 4px
 * grid), the app frame's page padding (32, or 16 on a phone), then the section
 * rhythm (hero 80, section-s 64, section 112). Every gap
 * and padding in the app is one of these; the values live in the brand tokens.
 */
export type Space = "none" | "xs" | "s" | "m" | "l" | "xl" | "xxl" | "xxxl" | "page" | "hero" | "section-s" | "section";
/** A gap between items: a step of the spacing scale. */
export type Gap = Space;

/** The CSS value of a spacing step. */
export const space = (step: Space): string => (step === "none" ? "0" : `var(--space-${step})`);

/** Side padding only: start and end from the scale, no top or bottom. */
export const sides = (step: Space): string => `0 ${space(step)}`;

/** A vertical inset: top and bottom from the scale, no side padding. */
export const inset = (top: Space, bottom: Space = top): string => `${space(top)} 0 ${space(bottom)}`;

const DISPLAY = "var(--font-headings-family)";
const MONO = "var(--font-family-mono)";
/** The brand's headline gradient (a token of the xwflow brand in xwui-lib). */
const GRADIENT = "var(--brand-text-gradient)";

/** A step of the xwflow type scale: size, leading and tracking come from the brand's --type-* tokens. */
const scale = (step: string, leading = true, tracking = true): Record<string, string> => ({
  fontSize: `var(--type-${step}-size)`,
  ...(leading ? { lineHeight: `var(--type-${step}-leading)` } : {}),
  ...(tracking ? { letterSpacing: `var(--type-${step}-tracking)` } : {}),
});

/** The prototype's type scale (.h-mega, .h1 to .h4, .lead, .small, .xs, .disp). */
const TYPE = {
  mega: { variant: "h1", fontFamily: DISPLAY, weight: 800, ...scale("mega") },
  /** The notations hero: the mega face one step smaller (the prototype's own override). */
  hero: { variant: "h1", fontFamily: DISPLAY, weight: 800, ...scale("hero") },
  h1: { variant: "h1", fontFamily: DISPLAY, weight: 800, ...scale("h1") },
  h2: { variant: "h2", fontFamily: DISPLAY, weight: 700, ...scale("h2") },
  h3: { variant: "h3", fontFamily: DISPLAY, weight: 700, ...scale("h3") },
  h4: { variant: "h4", weight: 800, ...scale("h4", false, false) },
  disp: { variant: "body", component: "div", fontFamily: DISPLAY, weight: 700, ...scale("disp") },
  lead: { variant: "body", component: "p", color: "secondary", ...scale("lead", true, false) },
  body: { variant: "body", component: "p", ...scale("body", true, false) },
  small: { variant: "body", component: "div", ...scale("small", false, false) },
  xs: { variant: "body", component: "span", ...scale("xs", false, false) },
} as const;

export type TextStyle = keyof typeof TYPE;

export interface TextOptions {
  tone?: "secondary" | "tertiary" | "gradient" | "lime";
  bold?: boolean;
  mono?: boolean;
  align?: "left" | "center" | "right";
  caps?: boolean;
  inline?: boolean;
  key?: string;
  /**
   * The heading level in the page outline, when it differs from the style's own
   * (an app page's title looks like h2 but is the page's h1).
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Read by screen readers, not shown (a page title the layout does not show). */
  hidden?: boolean;
}

export function text(style: TextStyle, value: string, options: TextOptions = {}): Node {
  const config: Record<string, unknown> = { ...TYPE[style] };
  if (options.tone === "gradient") Object.assign(config, { color: "gradient", gradient: GRADIENT });
  else if (options.tone === "lime") config.textColor = "var(--accent-primary)";
  else if (options.tone) config.color = options.tone;
  if (options.bold) config.weight = 800;
  if (options.mono) config.fontFamily = MONO;
  if (options.align) config.align = options.align;
  if (options.caps) Object.assign(config, { textTransform: "uppercase", letterSpacing: "var(--type-caps-tracking)" });
  if (options.inline) config.inline = true;
  if (options.level) config.component = `h${options.level}`;
  if (options.hidden) config.srOnly = true;
  return { tag: "xwui-typography", key: options.key, data: { text: value }, config };
}

/**
 * A page title drawn in pieces (one in the brand gradient): the pieces are shown
 * but hidden from screen readers, which read the whole sentence once as the h1.
 */
export function splitTitle(style: TextStyle, pieces: Array<{ text: string; tone?: TextOptions["tone"] }>, options: { justify?: StackOptions["justify"] } = {}): Node {
  const shown = pieces.map((piece) => {
    const node = text(style, piece.text, { tone: piece.tone });
    node.config = { ...node.config, component: "span", attrs: { "aria-hidden": "true" } };
    return node;
  });
  return stack([text(style, pieces.map((piece) => piece.text).join(" "), { level: 1, hidden: true }), row(shown, { gap: "m", wrap: true, justify: options.justify })], { gap: "none" });
}

/** A headline whose second line is the brand gradient ("Own the workflow." / "Watch every action."). */
export function headline(style: "mega" | "hero" | "h1" | "h2", title: string, highlight: string, align?: "center"): Node {
  const second = text(style, highlight, { tone: "gradient", align });
  // Plain inline text, so the gradient spans the words across their lines (not a column-wide box).
  second.config = { ...second.config, component: "span", inline: "text" };
  return stack([text(style, title, { align }), { tag: "xwui-box", config: { padding: space("none") }, slots: { children: second } }], { gap: "none", align: align ? "center" : undefined });
}

/** The lime overline that opens a section. */
export function eyebrow(value: string): Node {
  return {
    tag: "xwui-typography",
    data: { text: value },
    config: { variant: "overline", rule: true, fontSize: "var(--type-xs-size)", weight: 800, letterSpacing: "var(--type-eyebrow-tracking)", textTransform: "uppercase", textColor: "var(--accent-primary)" },
  };
}

export interface StackOptions {
  gap?: Gap;
  row?: boolean;
  wrap?: boolean;
  align?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  justify?: "flex-start" | "flex-end" | "center" | "space-between";
  key?: string;
}

export function stack(items: Node[], options: StackOptions = {}): Node {
  return {
    tag: "xwui-stack",
    key: options.key,
    config: {
      direction: options.row ? "row" : "column",
      gap: space(options.gap ?? "l"),
      wrap: options.wrap,
      align: options.align ?? (options.row ? "center" : undefined),
      justify: options.justify,
    },
    slots: { items },
  };
}

export const row = (items: Node[], options: Omit<StackOptions, "row"> = {}): Node => stack(items, { gap: "s", ...options, row: true });

/** One node centred on its own line, inside a stretched column. */
export const centred = (item: Node): Node => row([item], { justify: "center" });

/** Auto-fit columns never narrower than `min` (the prototype's g2 / g3 / g4). */
export function grid(items: Node[], min: CardWidth, gap: Gap = "xl"): Node {
  return { tag: "xwui-grid", config: { minChildWidth: `${cardWidths[min]}px`, gap: space(gap) }, slots: { children: items } };
}

export interface PanelOptions {
  pad?: "none" | "s" | "m" | "l";
  /** Scroll wide content (a table) sideways inside the panel. */
  scroll?: boolean;
  glow?: "lime" | "violet";
  gradientBorder?: boolean;
  key?: string;
}

const PAD = { none: undefined, s: space("l"), m: space("xl"), l: space("xxl") } as const;

/** A glass panel around one node (wrap several in a stack). */
export function glass(child: Node, options: PanelOptions = {}): Node {
  return {
    tag: "xwui-box",
    key: options.key,
    config: { surface: "glass", padding: PAD[options.pad ?? "m"], glow: options.glow, gradientBorder: options.gradientBorder, overflow: options.scroll ? "auto" : undefined },
    slots: { children: child },
  };
}

/** A page band: the 1280px column with the prototype's vertical rhythm. */
export function band(id: string, items: Node[], options: { tight?: boolean; gap?: Gap; padding?: string } = {}): Node {
  return {
    tag: "xwui-box",
    key: `band-${id}`,
    data: {},
    config: { as: "section", padding: options.padding ?? inset(options.tight ? "section-s" : "section"), ariaLabel: undefined },
    slots: { children: column(stack(items, { gap: options.gap ?? "xxxl" })) },
  };
}

export function column(child: Node): Node {
  return { tag: "xwui-container", config: { maxWidth: pageMax, center: true, padding: sides("xl") }, slots: { children: child } };
}

export type ButtonLook = "primary" | "glass" | "gradient" | "ghost";

export interface ButtonOptions {
  size?: "sm" | "md" | "lg";
  icon?: string;
  /** Icon after the label (an arrow), not before it. */
  iconAfter?: boolean;
  href?: string;
  label?: string;
  onClick?: () => void;
  key?: string;
  disabled?: boolean;
}

/** The prototype's .btn family: primary (lime), glass, gradient ring and ghost, all pills. */
export function button(look: ButtonLook, value: string, options: ButtonOptions = {}): Node {
  const variant =
    look === "primary"
      ? { variant: "primary" }
      : look === "gradient"
        ? { variant: "ghost", effect: "gradient-border" }
        : look === "glass"
          ? { variant: "secondary", tonal: true }
          : { variant: "ghost" };
  return {
    tag: "xwui-button",
    key: options.key,
    data: { text: value },
    config: {
      ...variant,
      shape: "pill",
      size: options.size ?? "md",
      icon: options.icon,
      iconPosition: options.iconAfter ? "right" : undefined,
      href: options.href,
      ariaLabel: options.label,
      title: options.label,
      disabled: options.disabled,
    },
    on: options.onClick ? { click: () => options.onClick?.() } : undefined,
  };
}

export function tag(value: string, hue?: Hue | "plan", note?: string, dot = false): Node {
  return { tag: "xwui-tag", data: { label: value, note }, config: { size: "sm", hue, dot } };
}

/** A centred reading column, for leads under a centred headline. */
export function measure(child: Node, width: Measure = "text"): Node {
  return { tag: "xwui-container", config: { maxWidth: measures[width], center: true, width: "100%" }, slots: { children: child } };
}

export type StatusTone = "success" | "error" | "running" | "neutral" | "warning" | "pinned" | "disabled";

export function status(tone: StatusTone, label = "", ariaLabel?: string): Node {
  return { tag: "xwui-status-glyph", data: { tone, label, ariaLabel }, config: { size: "md" } };
}

export function iconTile(icon: string, hue: Hue, size: "sm" | "md" = "md", ghost = false): Node {
  return { tag: "xwui-icon-tile", data: { icon }, config: { hue, size, ghost } };
}

export function icon(name: string, size = 18, color?: string): Node {
  return { tag: "xwui-icon", data: { name }, config: { size, color, decorative: true } };
}

export function shape(kind: "orb" | "ring" | "cube" | "halo", hue: Hue, size: number, place: Partial<Record<"top" | "right" | "bottom" | "left", string>>, thickness?: number): Node {
  return { tag: "xwui-glow-shape", data: { kind }, config: { hue, size, thickness, ...place } };
}

/** A named decoration from ui/decor.ts; `hue` overrides its colour where the page picks one (a run's outcome). */
export function decoration(name: DecorationName, hue?: Hue): Node {
  const item: Decoration = decorations[name];
  return shape(item.kind, hue ?? item.hue, item.size, item.place, item.thickness);
}

/**
 * Decorative shapes behind a box's content. They sit beside the content, not in
 * its stack, so they take no gap and push nothing down (a box takes a list).
 */
export function behind(shapes: Node[], content: Node): Node[] {
  return [...shapes, content];
}

/**
 * The class that keeps an XWUI switch's label for screen readers but hides it
 * on screen (public/theme/xwflow/components.css). The published XWUISwitch
 * names itself only from its label and ignores ariaLabel (README, known issues).
 */
export const quietLabel = "xwflow-quiet-label";


/** The XWFlow components built on a page, by key, so a page can reach one (an export, a listener). */
const mountedXWFlow = new Map<string, { destroy(): void }>();

/**
 * One of this app's XWFlow components (src/components), placed in a published
 * XWUI box. The box mounts first; then the component is built in it, the way
 * every XWUI component takes its container. `slots` are XWUI nodes handed to
 * the component as elements; `key` keeps one live instance per key and lets a
 * page reach it with xwflowInstance(); `ref` receives the component once built.
 */
export function xwflow(
  name: XWFlowComponentName,
  options: { data?: Record<string, unknown>; config?: Record<string, unknown>; slots?: Record<string, Node | Node[]>; key?: string; ref?: (instance: unknown) => void } = {},
): Node {
  return {
    tag: "xwui-box",
    config: { width: "100%" },
    ref: (box, element) => {
      const container = (box as { getElement?(): HTMLElement | null }).getElement?.() ?? element;
      const data: Record<string, unknown> = { ...(options.data ?? {}) };
      for (const [field, slot] of Object.entries(options.slots ?? {})) {
        data[field] = Array.isArray(slot) ? slot.map((child) => XWUIComposer.element(child)).filter(Boolean) : XWUIComposer.element(slot);
      }
      if (options.key) mountedXWFlow.get(options.key)?.destroy();
      const Component = xwflowComponents[name];
      const instance = new Component(container, data as never, (options.config ?? {}) as never);
      if (options.key) mountedXWFlow.set(options.key, instance);
      options.ref?.(instance);
    },
  };
}

/** The live XWFlow component placed with this key, if any. */
export function xwflowInstance<T>(key: string): T | undefined {
  return mountedXWFlow.get(key) as T | undefined;
}

export function keys(value: string[], size: "sm" | "md" = "md"): Node {
  return { tag: "xwui-kbd", data: { keys: value }, config: { size } };
}

/**
 * An XWUI element for a slot that takes an element, such as an XWUITable cell.
 * The published XWUIComposer.element() drops a node's `ref` (README, known
 * issues), so a ref is handed its instance on the first pointer or focus contact
 * with the element, before a click inside it reaches the component.
 */
export function cell(node: Node): HTMLElement | string {
  const { ref } = node;
  if (!ref) return XWUIComposer.element(node) ?? "";
  let handed = false;
  const handOver = (event: Event, instance: unknown): void => {
    if (handed || !instance) return;
    handed = true;
    ref(instance, event.currentTarget as HTMLElement);
  };
  return XWUIComposer.element({ ...node, ref: undefined, on: { ...node.on, pointerdown: handOver, focusin: handOver } }) ?? "";
}

export function separator(): Node {
  return { tag: "xwui-separator" };
}

/** A list of lines, each led by a ring in the given hue (the prototype's ticks). */
export function ticks(items: string[], hue: Hue = "lime"): Node {
  return stack(
    items.map((item) => row([icon("circle-dot", 16, `var(--xwui-hue-${hue})`), text("small", item, { tone: "secondary" })], { gap: "m", align: "flex-start" })),
    { gap: "m" },
  );
}
