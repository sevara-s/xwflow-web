import { el } from "../dom";
import type { Shell } from "./studio";

/** Full-bleed pages (editor, notation views) draw their own chrome. */
export function mountBareShell(root: HTMLElement): Shell {
  const frame = el("div", "xwflow-bare");
  const header = el("div", "xwflow-bare__header");
  const body = el("main", "xwflow-bare__body");
  frame.append(header, body);
  root.replaceChildren(frame);
  return { header, body, update() {}, destroy() {} };
}
