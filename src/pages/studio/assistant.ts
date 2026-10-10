import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { navigate, paths } from "../../app/router";
import { XWFlowCanvas } from "../../components/XWFlowCanvas/XWFlowCanvas";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { catalog } from "../../content/catalog";
import type { AssistantDraft, AssistantHome } from "../../types/domain";
import { XWUIButton, XWUIInputTextarea, XWUIProgressSpinner } from "../../xwui";
import { canvasData } from "./canvas";
import { glass, heading, mountAppBar, mountTag } from "./common";
import "./assistant.css";

const words = catalog.studio.assistant;

export async function render(context: PageContext): Promise<void> {
  const { scope, body, workspace } = context;
  const home = await api.getAssistantHome();

  const bar = mountAppBar(context, [{ label: words.crumb }], { sample: null });
  const help = scope.track(new XWUIButton(slot(bar.actions), { text: catalog.studio.topbar.help }, { variant: "ghost", size: "sm", icon: "help-circle" }));
  help.onClick(() => notify(words.lead, "info"));

  const page = el("div", "xwflow-assistant");
  body.append(page);
  scope.track(new XWFlowShape(slot(page), { kind: "halo" }, { size: 460, color: "violet", place: { left: "30%", top: "60px" } }));
  scope.track(new XWFlowShape(slot(page), { kind: "halo" }, { size: 300, color: "cyan", place: { right: "6%", top: "-40px" } }));

  /* The glowing core */
  const core = el("div", "xwflow-assistant__core");
  page.append(core);
  scope.track(new XWFlowShape(slot(core), { kind: "orb" }, { size: 120, color: "violet", place: { left: "40px", top: "40px" } }));
  const ringA = slot(core, "xwflow-assistant__ring xwflow-assistant__ring--flat");
  scope.track(new XWFlowShape(slot(ringA), { kind: "ring" }, { size: 200, thickness: 4, place: { left: "0", top: "0" } }));
  const ringB = slot(core, "xwflow-assistant__ring xwflow-assistant__ring--tilt");
  scope.track(new XWFlowShape(slot(ringB), { kind: "ring" }, { size: 170, thickness: 3, place: { left: "0", top: "0" } }));

  const intro = el("div", "xwflow-stack xwflow-gap-8 xwflow-assistant__intro");
  const title = el("h1", "xwflow-h2");
  title.append(`${words.titleBefore} `, el("span", "xwflow-grad-text", words.titleHighlight), ` ${words.titleAfter}`);
  intro.append(title, el("p", "xwflow-sec", words.lead));
  page.append(intro);

  /* Prompt */
  const prompt = glass(page, { border: "gradient", className: "xwflow-assistant__prompt" });
  const label = el("label", "xwflow-assistant__label", words.promptLabel);
  label.htmlFor = "xwflow-assistant-prompt";
  prompt.append(label);
  const textarea = scope.track(
    new XWUIInputTextarea(slot(prompt, "xwflow-assistant__input"), { placeholder: words.promptPlaceholder, rows: 3, id: "xwflow-assistant-prompt" }, {
      fullWidth: true,
      autoResize: true,
      resize: "none",
    }),
  );
  const tools = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  prompt.append(tools);
  for (const [icon, aria] of [["paperclip", words.attach], ["mic", words.speak]] as const) {
    const button = scope.track(new XWUIButton(slot(tools), { text: "" }, { variant: "ghost", size: "sm", icon, ariaLabel: aria, title: aria }));
    button.onClick(() => notify(fill(words.notInPreview, { name: aria }), "info"));
  }
  mountTag(slot(tools), scope, { label: workspace.project.name, color: "violet" });
  tools.append(el("span", "xwflow-xs xwflow-ter xwflow-push", words.focusHint));
  const send = scope.track(new XWUIButton(slot(tools), { text: words.send }, { variant: "primary", icon: "send", iconPosition: "right", disabled: true }));
  textarea.onChange((value) => send.setDisabled(!value.trim()));

  const onKey = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      textarea.focus();
    }
  };
  document.addEventListener("keydown", onKey);
  scope.track({ destroy: () => document.removeEventListener("keydown", onKey) });

  /* Suggestions */
  const pills = el("div", "xwflow-wrap xwflow-gap-8 xwflow-assistant__pills");
  page.append(pills);
  const pillButtons = new Map<string, XWUIButton>();
  for (const suggestion of home.suggestions) {
    const pill = scope.track(
      new XWUIButton(slot(pills), { text: suggestion.label }, { variant: "ghost", className: "xwflow-pill", toggleable: true, pressed: suggestion.id === home.activeSuggestion }),
    );
    pillButtons.set(suggestion.id, pill);
    pill.onClick(() => {
      for (const [id, button] of pillButtons) button.setPressed(id === suggestion.id);
      textarea.setValue(suggestion.label);
      send.setDisabled(false);
      void propose(suggestion.label);
    });
  }
  const seeAll = scope.track(new XWUIButton(slot(pills), { text: words.seeAll }, { variant: "ghost", size: "sm" }));
  seeAll.onClick(() => notify(fill(words.notInPreview, { name: words.seeAll }), "info"));

  /* Preview of the drafted flow */
  const preview = glass(page, { className: "xwflow-stack xwflow-gap-12 xwflow-assistant__preview", label: words.preview });
  const previewHead = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  const previewBody = el("div", "xwflow-assistant__canvas");
  preview.append(previewHead, previewBody);
  let previewOwned: Array<{ destroy(): void }> = [];
  const previewScope: Tracker = { track: (item) => (previewOwned.push(item), item) };
  scope.track({ destroy: () => previewOwned.splice(0).forEach((item) => item.destroy()) });

  let draft: AssistantDraft = { prompt: "", title: home.preview.title, graph: home.preview.graph };
  const showPreview = (saveable: boolean): void => {
    previewOwned.splice(0).forEach((item) => item.destroy());
    previewHead.replaceChildren();
    previewBody.replaceChildren();
    previewHead.append(el("b", undefined, words.preview));
    mountTag(slot(previewHead), previewScope, { label: words.flowTag, color: "lime" });
    previewHead.append(el("span", "xwflow-small xwflow-sec", draft.title));
    const end = slot(previewHead, "xwflow-push xwflow-row xwflow-gap-8");
    mountTag(slot(end), previewScope, { label: words.readOnly, color: "plan" });
    if (saveable) {
      const save = previewScope.track(new XWUIButton(slot(end), { text: words.saveDraft }, { variant: "primary", size: "sm" }));
      save.onClick(async () => {
        try {
          const flow = await api.saveDraft(draft);
          notify(fill(words.saved, { name: flow.name }), "success");
          navigate(paths.flow(flow.id));
        } catch (error) {
          notify(errorMessage(error), "danger");
        }
      });
    }
    previewScope.track(new XWFlowCanvas(slot(previewBody), canvasData(draft.graph, null), { readOnly: true, height: 150, maxFitScale: 1 }));
  };

  async function propose(text: string): Promise<void> {
    previewOwned.splice(0).forEach((item) => item.destroy());
    previewBody.replaceChildren();
    const pending = slot(previewBody, "xwflow-pending");
    const spinner = new XWUIProgressSpinner(pending, { label: words.drafting });
    send.setLoading(true);
    try {
      draft = await api.draftFlow(text);
      showPreview(true);
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      spinner.destroy();
      send.setLoading(false);
    }
  }
  send.onClick(() => {
    const text = textarea.getValue().trim();
    if (text) void propose(text);
  });
  showPreview(false);

  renderStarters(page, scope, home);
  renderRecommended(page, scope, home, (title) => {
    textarea.setValue(title);
    send.setDisabled(false);
    void propose(title);
    textarea.focus();
  });
}

function renderStarters(page: HTMLElement, scope: Tracker, home: AssistantHome): void {
  const section = el("section", "xwflow-stack xwflow-gap-12");
  section.setAttribute("aria-label", words.startDirectly);
  page.append(section);
  heading(section, 2, "h3", words.startDirectly);
  const grid = el("div", "xwflow-grid");
  grid.style.setProperty("--xwflow-min", "150px");
  section.append(grid);
  for (const starter of home.starters) {
    const tile = el("a", "xwflow-assistant__tile");
    tile.href = starter.route === "flows" ? `#${paths.flows}` : "#";
    tile.dataset.group = starter.group;
    const icon = el("span");
    tile.append(icon, el("b", undefined, starter.label), el("span", "xwflow-xs xwflow-sec", starter.hint));
    scope.track(new XWFlowStepIcon(icon, { icon: catalog.studio.groupIcons[starter.group], group: starter.group }, { size: "sm" }));
    if (!starter.route) {
      tile.addEventListener("click", (event) => {
        event.preventDefault();
        notify(fill(words.notInPreview, { name: starter.label }), "info");
      });
    }
    grid.append(tile);
  }
}

function renderRecommended(page: HTMLElement, scope: Tracker, home: AssistantHome, pick: (title: string) => void): void {
  const section = el("section", "xwflow-stack xwflow-gap-12");
  section.setAttribute("aria-label", words.recommended);
  page.append(section);
  const head = el("div", "xwflow-row xwflow-gap-8");
  section.append(head);
  heading(head, 2, "h3", words.recommended);
  const toggle = scope.track(new XWUIButton(slot(head, "xwflow-push"), { text: words.hide }, { variant: "ghost", size: "sm" }));
  const grid = el("div", "xwflow-grid");
  grid.style.setProperty("--xwflow-min", "300px");
  section.append(grid);
  toggle.onClick(() => {
    grid.hidden = !grid.hidden;
    toggle.setText(grid.hidden ? words.show : words.hide);
  });

  for (const item of home.recommended) {
    const card = el("button", "xwflow-assistant__tile xwflow-assistant__tile--wide");
    card.type = "button";
    card.dataset.group = item.groups[0];
    if (item.top) {
      card.dataset.top = "";
      mountTag(slot(card), scope, { label: words.topPick, color: "violet" });
    }
    card.append(el("b", undefined, item.title));
    if (item.summary) card.append(el("span", "xwflow-small xwflow-sec", item.summary));
    const icons = el("div", "xwflow-row xwflow-gap-4");
    for (const group of item.groups) {
      scope.track(new XWFlowStepIcon(slot(icons), { icon: catalog.studio.groupIcons[group], group }, { size: "sm" }));
    }
    const count = fill(words.steps, { n: item.groups.length });
    icons.append(el("span", "xwflow-xs xwflow-sec xwflow-push", item.toConnect ? `${count}, ${fill(words.toConnect, { n: item.toConnect })}` : count));
    card.append(icons);
    card.addEventListener("click", () => pick(item.title));
    grid.append(card);
  }
}
