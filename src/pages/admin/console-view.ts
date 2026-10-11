import { glass, quietLabel, row, stack, text, type Node } from "../../ui/kit";
import type { XWUISelect } from "../../xwui";

type Changeable<T> = { onChange(handler: (value: T) => void): void };

/** A console page's head: its title and one line on what it is for. */
export function pageHead(title: string, lead: string): Node[] {
  return [text("h2", title), text("lead", lead)];
}

/** An XWUI select whose empty "any" choice reads as its label, not "Select...". */
export function choice(value: string, options: ReadonlyArray<{ value: string; label: string }>, label: string, onPick: (value: string) => void, extra: { fullWidth?: boolean; title?: string } = {}): Node {
  return {
    tag: "xwui-select",
    data: { value, options: options.map((item) => ({ ...item })), placeholder: options.find((item) => item.value === "")?.label, label: extra.title },
    config: { ariaLabel: label, fullWidth: extra.fullWidth },
    ref: (instance) => (instance as XWUISelect).onChange((picked) => onPick(String(picked))),
  };
}

/** An XWUI switch that reports each change. */
export function toggle(checked: boolean, label: string, onChange: (checked: boolean) => void, disabled = false): Node {
  return {
    tag: "xwui-switch",
    data: { checked, label },
    config: { ariaLabel: label, disabled, className: quietLabel },
    ref: (instance) => (instance as Changeable<boolean>).onChange(onChange),
  };
}

/** One setting: its title and detail on the start side, the control on the end side. */
export function settingRow(title: string, detail: string, control: Node): Node {
  return row([stack([text("body", title, { bold: true }), text("small", detail, { tone: "secondary" })], { gap: "xs" }), control], { justify: "space-between", gap: "l" });
}

/** A KPI card: label, value and an optional note under it. */
export function kpi(label: string, value: string, hue: string, note?: string): Node {
  return { tag: "xwui-kpi-card", data: { label, value, ...(note ? { note } : {}) }, config: { hue } };
}

/** A glass panel with a heading and its content. */
export function section(title: string, children: Node[], options: { pad?: "s" | "m" | "l"; aside?: Node } = {}): Node {
  return glass(stack([options.aside ? row([text("h3", title), options.aside], { justify: "space-between", wrap: true, gap: "m" }) : text("h3", title), ...children], { gap: "l" }), { pad: options.pad ?? "m" });
}
