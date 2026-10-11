/**
 * The view-node shape XWUI projectors return, and a small DOM renderer for it.
 *
 * The custom components in this folder follow XWUI's own pattern (a headless
 * logic class, a pure projector, a thin adapter on the published
 * XWUIComponent), but the published basic bundle does not export its engine's
 * view mount or `h`. This file provides both: `h` builds a node, `renderInto`
 * draws a node tree into a container, replacing what was there.
 */

export type XWUIViewRef = (element: HTMLElement | null) => void;

export interface XWUIViewNode {
  tag: string;
  key?: string | number;
  ref?: XWUIViewRef;
  class?: Array<string | false | null | undefined>;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  props?: Record<string, unknown>;
  style?: Record<string, string | number | null | undefined>;
  events?: Record<string, (event: Event) => void>;
  /** The component fills this element itself (from its ref); the renderer leaves its children alone. */
  hostOwned?: boolean;
  children?: XWUIViewChild[];
}

export type XWUIViewChild = XWUIViewNode | string | number | false | null | undefined;

/** The state a projector reads: the component's data and config. */
export interface XWUIComponentStateSnapshot<Data, Config> {
  data: Data;
  config: Config;
}

export function h(tag: string, attributes: Omit<XWUIViewNode, "tag" | "children"> = {}, ...children: XWUIViewChild[]): XWUIViewNode {
  const node: XWUIViewNode = { tag, ...attributes };
  if (children.length) node.children = children;
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function hyphenate(name: string): string {
  return name.startsWith("--") ? name : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function build(node: XWUIViewChild, inSvg: boolean, refs: Array<[XWUIViewRef, HTMLElement]>): Node | null {
  if (node === null || node === undefined || node === false) return null;
  if (typeof node === "string" || typeof node === "number") return document.createTextNode(String(node));
  const svg = inSvg || node.tag === "svg";
  const element = svg ? document.createElementNS(SVG_NS, node.tag) : document.createElement(node.tag);
  const classes = (node.class ?? []).filter(Boolean).flatMap((token) => String(token).split(/\s+/)).filter(Boolean);
  if (classes.length) element.setAttribute("class", [...new Set(classes)].join(" "));
  for (const [name, value] of Object.entries(node.attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(name, value === true ? "" : String(value));
  }
  for (const [name, value] of Object.entries(node.style ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    (element as HTMLElement).style.setProperty(hyphenate(name), String(value));
  }
  for (const [name, value] of Object.entries(node.props ?? {})) (element as unknown as Record<string, unknown>)[name] = value;
  for (const [name, handler] of Object.entries(node.events ?? {})) element.addEventListener(name, handler);
  for (const child of node.children ?? []) {
    const built = build(child, svg && node.tag !== "foreignObject", refs);
    if (built) element.appendChild(built);
  }
  if (node.ref) refs.push([node.ref, element as HTMLElement]);
  return element;
}

/** Draw `node` into `container`, replacing its previous content, then hand each ref its element. */
export function renderInto(container: HTMLElement, node: XWUIViewNode): void {
  const refs: Array<[XWUIViewRef, HTMLElement]> = [];
  const built = build(node, false, refs);
  container.replaceChildren(...(built ? [built] : []));
  for (const [ref, element] of refs) ref(element);
}
