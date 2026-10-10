import { el } from "../../app/dom";
import { layoutBars } from "./XWFlowWaterfall.logic";
import type { XWFlowWaterfallConfig, XWFlowWaterfallData } from "./XWFlowWaterfall.types";

export function renderWaterfall(container: HTMLElement, data: XWFlowWaterfallData, config: XWFlowWaterfallConfig): void {
  container.className = ["xwflow-waterfall", config.className].filter(Boolean).join(" ");
  container.setAttribute("role", "list");
  container.setAttribute("aria-label", data.label);
  const bars = layoutBars(data.rows, config.minShare);
  const nodes: HTMLElement[] = [];
  data.rows.forEach((row, index) => {
    const label = el("b", "xwflow-waterfall__label", row.label);
    if (row.muted) label.dataset.muted = "";
    const track = el("div", "xwflow-waterfall__track");
    track.setAttribute("role", "listitem");
    track.setAttribute("aria-label", `${row.label}: ${row.caption}`);
    const bar = bars[index];
    const caption = el("span", "xwflow-waterfall__caption", row.caption);
    if (bar) {
      const fill = el("i", "xwflow-waterfall__bar");
      fill.dataset.group = row.group;
      if (row.failed) fill.dataset.failed = "";
      fill.style.left = `${bar.left}%`;
      fill.style.width = `${bar.width}%`;
      track.append(fill);
      caption.style[bar.captionSide] = `${bar.captionAt}%`;
    } else {
      caption.style.left = "2%";
    }
    track.append(caption);
    nodes.push(label, track);
  });
  container.replaceChildren(...nodes);
}
