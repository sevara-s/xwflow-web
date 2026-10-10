import { el, svg } from "../../app/dom";
import type { XWFlowIsoTilesConfig, XWFlowIsoTilesData } from "./XWFlowIsoTiles.types";

export function renderIsoTiles(container: HTMLElement, data: XWFlowIsoTilesData, config: XWFlowIsoTilesConfig): void {
  const variant = config.variant ?? "tile";
  const width = config.width ?? 360;
  const height = config.height ?? 360;
  const tilt = config.tilt ?? { x: 58, z: -45 };
  container.className = ["xwflow-iso", config.className].filter(Boolean).join(" ");
  container.dataset.variant = variant;
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", data.label);
  const plane = el("div", "xwflow-iso__plane");
  Object.assign(plane.style, { width: `${width}px`, height: `${height}px`, marginLeft: `${-width / 2}px`, transform: `rotateX(${tilt.x}deg) rotateZ(${tilt.z}deg)` });
  if (config.floor) plane.append(el("div", "xwflow-iso__floor"));
  if (config.links && data.tiles.length > 1) {
    const [hub, ...rest] = data.tiles;
    const size = variant === "hub" ? 86 : 120;
    const wires = svg("svg", { class: "xwflow-iso__wires", width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" });
    for (const tile of rest) {
      wires.append(
        svg("path", {
          d: `M${hub.x + size / 2} ${hub.y + size / 2} L${tile.x + size / 2} ${tile.y + size / 2}`,
          "data-state": tile.state,
          class: "xwflow-iso__wire",
        }),
      );
    }
    plane.append(wires);
  }
  for (const tile of data.tiles) {
    const node = el("div", "xwflow-iso__tile", tile.label);
    node.dataset.state = tile.state;
    Object.assign(node.style, { left: `${tile.x}px`, top: `${tile.y}px` });
    node.style.setProperty("--xwflow-lift", `${tile.lift ?? 30}px`);
    plane.append(node);
  }
  container.replaceChildren(plane);
}
