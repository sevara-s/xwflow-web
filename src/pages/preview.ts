import { catalog } from "../content/catalog";

type PreviewId = "assistant" | "templates" | "insights" | "settings";

export function renderPreview(slot: HTMLElement, id: PreviewId): void {
  const copy = catalog.studio.previews[id];
  slot.replaceChildren();
  const panel = document.createElement("section");
  panel.className = "xwflow-preview";
  const kicker = document.createElement("p");
  kicker.className = "xwflow-preview__kicker";
  kicker.textContent = catalog.studio.preview;
  const title = document.createElement("h1");
  title.textContent = copy.title;
  const body = document.createElement("p");
  body.textContent = copy.body;
  panel.append(kicker, title, body);
  slot.append(panel);
}
