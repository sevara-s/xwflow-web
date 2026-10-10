import { el } from "../../app/dom";

export interface SceneSlots {
  plane: HTMLElement;
  canvas: HTMLElement;
}

export function renderScene(container: HTMLElement, label: string, width: number, height: number, ring: boolean, className?: string): SceneSlots {
  container.className = ["xwflow-scene", className].filter(Boolean).join(" ");
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", label);
  const plane = el("div", "xwflow-scene__plane");
  plane.style.width = `${width}px`;
  plane.style.height = `${height}px`;
  plane.style.marginLeft = `${-width / 2}px`;
  plane.append(el("div", "xwflow-scene__floor"));
  if (ring) plane.append(el("div", "xwflow-scene__ring"));
  const canvas = el("div", "xwflow-scene__canvas");
  plane.append(canvas);
  container.replaceChildren(plane);
  return { plane, canvas };
}
