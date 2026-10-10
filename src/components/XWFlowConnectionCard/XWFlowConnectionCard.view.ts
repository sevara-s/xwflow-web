import { el } from "../../app/dom";
import { cardSeverity, splitEmphasis } from "./XWFlowConnectionCard.logic";
import type { XWFlowConnectionCardConfig, XWFlowConnectionCardData } from "./XWFlowConnectionCard.types";

export interface ConnectionCardSlots {
  icon: HTMLElement;
  status: HTMLElement;
  tags: HTMLElement[];
  action: HTMLElement;
}

export function renderConnectionCard(
  container: HTMLElement,
  data: XWFlowConnectionCardData,
  config: XWFlowConnectionCardConfig,
): ConnectionCardSlots {
  container.className = ["xwflow-connection", config.className].filter(Boolean).join(" ");
  container.dataset.severity = cardSeverity(data.status.tone);
  container.dataset.group = data.group;
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", data.name);

  const head = el("div", "xwflow-connection__head");
  const icon = el("span");
  const title = el("div", "xwflow-connection__title");
  title.append(el("b", undefined, data.name), el("div", "xwflow-connection__sub", data.subtitle));
  const status = el("span");
  head.append(icon, title, status);

  const mask = el("div", "xwflow-connection__mask", data.mask);
  mask.setAttribute("aria-label", data.maskLabel);

  const note = el("p", "xwflow-connection__note");
  if (data.note.muted) note.dataset.muted = "";
  const [before, bold, after] = splitEmphasis(data.note.text, data.note.emphasis);
  note.append(before);
  if (bold) note.append(el("b", undefined, bold));
  note.append(after);

  const foot = el("div", "xwflow-connection__foot");
  const tags = data.tags.map(() => el("span"));
  const action = el("span", "xwflow-connection__action");
  foot.append(...tags, action);

  container.replaceChildren(head, mask, note, foot);
  return { icon, status, tags, action };
}
