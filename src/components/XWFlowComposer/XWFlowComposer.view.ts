import type { XWFlowComposerData } from "./XWFlowComposer.types";

export interface ComposerSlots {
  title: HTMLElement;
  accent: HTMLElement;
  close: HTMLElement;
  lede: HTMLElement;
  prompt: HTMLElement;
  scope: HTMLElement;
  build: HTMLElement;
  suggestions: HTMLElement[];
  draft: HTMLElement;
}

export function renderComposer(container: HTMLElement, data: XWFlowComposerData): ComposerSlots {
  container.classList.add("xwflow-composer");
  container.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "xwflow-composer__grid";
  const copy = document.createElement("div");
  copy.className = "xwflow-composer__copy";

  const titleWrap = document.createElement("div");
  titleWrap.className = "xwflow-composer__title";
  titleWrap.id = "xwflow-composer-title";
  const title = host();
  const accent = host();
  const close = host();
  titleWrap.append(title, accent, close);

  const lede = host();
  const field = document.createElement("div");
  field.className = "xwflow-composer__field";
  const prompt = host("xwflow-composer__prompt");
  const row = document.createElement("div");
  row.className = "xwflow-composer__row";
  const scope = host("xwflow-composer__scope");
  const build = host("xwflow-cmd is-lime is-compact");
  row.append(scope, build);
  field.append(prompt, row);

  const ideas = document.createElement("div");
  ideas.className = "xwflow-composer__ideas";
  ideas.setAttribute("role", "group");
  ideas.setAttribute("aria-label", data.suggestionsLabel);
  const suggestions = data.suggestions.map(() => {
    const node = host("xwflow-composer__idea");
    ideas.append(node);
    return node;
  });

  copy.append(titleWrap, lede, field, ideas);

  const glow = document.createElement("div");
  glow.className = "xwflow-composer__glow";
  const draft = host("xwflow-composer__draft");
  draft.setAttribute("aria-live", "polite");
  glow.append(draft);

  grid.append(copy, glow);
  container.append(grid);
  return { title, accent, close, lede, prompt, scope, build, suggestions, draft };
}

function host(className?: string): HTMLDivElement {
  const node = document.createElement("div");
  if (className) node.className = className;
  return node;
}
