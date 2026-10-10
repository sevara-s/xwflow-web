/**
 * The prototype's visual vocabulary as XWUI composer nodes.
 *
 * Every function returns data for XWUIComposer: which XWUI component, with
 * which data and config. Nothing here touches the DOM or ships CSS; colours,
 * glass and glows come from the xwflow XWUI theme, and the type scale below
 * is the prototype's own (xw.css).
 */
import { XWUIComposer, type XWUIComposerNode } from "../xwui";

export type Node = XWUIComposerNode;
export type Hue = "lime" | "cyan" | "violet" | "pink" | "orange" | "green" | "amber" | "red" | "blue";
/** Gap in pixels; the prototype uses 4, 8, 12, 16, 24, 32 and 48. */
export type Gap = number;

const DISPLAY = "var(--font-headings-family)";
const MONO = "var(--font-family-mono)";
const GRADIENT = "linear-gradient(100deg, #2ee6ff 0%, #9b6bff 34%, #ff4fa3 66%, #ff8a3d 100%)";

/** The prototype's type scale (.h-mega, .h1 to .h4, .lead, .small, .xs, .disp). */
const TYPE = {
  mega: { variant: "h1", fontFamily: DISPLAY, weight: 800, fontSize: "clamp(2.6rem, 7.2vw, 6.4rem)", lineHeight: 0.98, letterSpacing: "-0.035em" },
  h1: { variant: "h1", fontFamily: DISPLAY, weight: 800, fontSize: "clamp(2.2rem, 4.8vw, 4rem)", lineHeight: 1.03, letterSpacing: "-0.03em" },
  h2: { variant: "h2", fontFamily: DISPLAY, weight: 700, fontSize: "clamp(1.8rem, 3.4vw, 3rem)", lineHeight: 1.08, letterSpacing: "-0.025em" },
  h3: { variant: "h3", fontFamily: DISPLAY, weight: 700, fontSize: "1.25rem", lineHeight: 1.25, letterSpacing: "-0.01em" },
  h4: { variant: "h4", weight: 800, fontSize: "1rem" },
  disp: { variant: "body", component: "div", fontFamily: DISPLAY, weight: 700, fontSize: "1.9rem", lineHeight: 1.15, letterSpacing: "-0.02em" },
  lead: { variant: "body", component: "p", color: "secondary", fontSize: "1.2rem", lineHeight: 1.6 },
  body: { variant: "body", component: "p", fontSize: "1rem", lineHeight: 1.55 },
  small: { variant: "body", component: "div", fontSize: "0.875rem" },
  xs: { variant: "body", component: "span", fontSize: "0.75rem" },
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
}

export function text(style: TextStyle, value: string, options: TextOptions = {}): Node {
  const config: Record<string, unknown> = { ...TYPE[style] };
  if (options.tone === "gradient") Object.assign(config, { color: "gradient", gradient: GRADIENT });
  else if (options.tone === "lime") config.textColor = "var(--accent-primary)";
  else if (options.tone) config.color = options.tone;
  if (options.bold) config.weight = 800;
  if (options.mono) config.fontFamily = MONO;
  if (options.align) config.align = options.align;
  if (options.caps) Object.assign(config, { textTransform: "uppercase", letterSpacing: "0.1em" });
  if (options.inline) config.inline = true;
  return { tag: "xwui-typography", key: options.key, data: { text: value }, config };
}

/** A headline whose second line is the brand gradient ("Own the workflow." / "Watch every action."). */
export function headline(style: "mega" | "h1" | "h2", title: string, highlight: string, align?: "center"): Node {
  const second = text(style, highlight, { tone: "gradient", align });
  // Inline, so the gradient flows across the highlight's wrapped lines as one run.
  second.config = { ...second.config, component: "span", inline: true };
  return stack([text(style, title, { align }), { tag: "xwui-box", config: { padding: 0 }, slots: { children: second } }], { gap: 0, align: align ? "center" : undefined });
}

/** The lime overline that opens a section. */
export function eyebrow(value: string): Node {
  return {
    tag: "xwui-typography",
    data: { text: value },
    config: { variant: "overline", rule: true, fontSize: "0.75rem", weight: 800, letterSpacing: "0.14em", textTransform: "uppercase", textColor: "var(--accent-primary)" },
  };
}

export interface StackOptions {
  gap?: Gap | 0;
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
      gap: `${options.gap ?? 16}px`,
      wrap: options.wrap,
      align: options.align ?? (options.row ? "center" : undefined),
      justify: options.justify,
    },
    slots: { items },
  };
}

export const row = (items: Node[], options: Omit<StackOptions, "row"> = {}): Node => stack(items, { gap: 8, ...options, row: true });

/** One node centred on its own line, inside a stretched column. */
export const centred = (item: Node): Node => row([item], { justify: "center" });

/** Auto-fit columns never narrower than `min` (the prototype's g2 / g3 / g4). */
export function grid(items: Node[], min: 440 | 300 | 230 | number, gap = 20): Node {
  return { tag: "xwui-grid", config: { minChildWidth: `${min}px`, gap: `${gap}px` }, slots: { children: items } };
}

export interface PanelOptions {
  pad?: "none" | "s" | "m" | "l";
  glow?: "lime" | "violet";
  gradientBorder?: boolean;
  key?: string;
}

const PAD = { none: undefined, s: 16, m: 24, l: 36 } as const;

/** A glass panel around one node (wrap several in a stack). */
export function glass(child: Node, options: PanelOptions = {}): Node {
  return {
    tag: "xwui-box",
    key: options.key,
    config: { surface: "glass", padding: PAD[options.pad ?? "m"], glow: options.glow, gradientBorder: options.gradientBorder },
    slots: { children: child },
  };
}

/** A page band: the 1280px column with the prototype's vertical rhythm. */
export function band(id: string, items: Node[], options: { tight?: boolean; gap?: Gap } = {}): Node {
  return {
    tag: "xwui-box",
    key: `band-${id}`,
    data: {},
    config: { as: "section", padding: options.tight ? "64px 0" : "110px 0", ariaLabel: undefined },
    slots: { children: column(stack(items, { gap: options.gap ?? 48 })) },
  };
}

export function column(child: Node): Node {
  return { tag: "xwui-container", config: { maxWidth: 1280, center: true, padding: "0 24px" }, slots: { children: child } };
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
export function measure(child: Node, width = 720): Node {
  return { tag: "xwui-container", config: { maxWidth: width, center: true, width: "100%" }, slots: { children: child } };
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

export function keys(value: string[]): Node {
  return { tag: "xwui-kbd", data: { keys: value } };
}

/** An XWUI element for a slot that takes an element, such as an XWUITable cell. */
export function cell(node: Node): HTMLElement | string {
  return XWUIComposer.element(node) ?? "";
}

export function separator(): Node {
  return { tag: "xwui-separator" };
}

/** A list of lines, each led by a ring in the given hue (the prototype's ticks). */
export function ticks(items: string[], hue: Hue = "lime"): Node {
  return stack(
    items.map((item) => row([icon("circle-dot", 16, `var(--xwui-hue-${hue})`), text("small", item, { tone: "secondary" })], { gap: 10, align: "flex-start" })),
    { gap: 10 },
  );
}
