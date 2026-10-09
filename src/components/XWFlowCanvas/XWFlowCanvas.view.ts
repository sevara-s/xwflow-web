import type { FlowCanvasModel } from "./XWFlowCanvas.types";

export function renderCanvas(
  container: HTMLElement,
  model: FlowCanvasModel,
  onSelect: (stepId: string) => void,
): void {
  container.classList.add("xwflow-canvas");
  container.replaceChildren();
  if (!model.nodes.length) {
    const empty = document.createElement("p");
    empty.className = "xwflow-canvas__empty";
    empty.textContent = model.emptyLabel;
    container.append(empty);
    return;
  }

  const list = document.createElement("ol");
  list.className = "xwflow-canvas__list";
  list.setAttribute("aria-label", model.listLabel);

  for (const node of model.nodes) {
    const item = document.createElement("li");
    item.className = "xwflow-canvas__item";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "xwflow-canvas__node";
    button.dataset.kind = node.kind;
    button.setAttribute("aria-pressed", String(node.selected));
    if (node.selected) button.classList.add("is-selected");

    const kind = document.createElement("span");
    kind.className = "xwflow-canvas__kind";
    kind.textContent = node.kindLabel;

    const name = document.createElement("strong");
    name.className = "xwflow-canvas__name";
    name.textContent = node.name;

    const summary = document.createElement("span");
    summary.className = "xwflow-canvas__summary";
    summary.textContent = node.summary;

    button.append(kind, name, summary);
    button.addEventListener("click", () => onSelect(node.id));
    item.append(button);
    list.append(item);
  }

  container.append(list);
}
