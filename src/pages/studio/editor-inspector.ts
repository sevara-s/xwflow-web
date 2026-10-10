import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatMs } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import { debounce } from "../../app/timing";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { CanvasNode, Connection, FlowDetail, StepDetail } from "../../types/domain";
import { XWUIButton, XWUIInputSwitch, XWUIInputText, XWUIInputTextarea, XWUIKbd, XWUINavTabs, XWUISelect } from "../../xwui";
import { nodeViews } from "./canvas";
import { mountTag } from "./common";

const words = catalog.studio.editor;

export interface InspectorContext {
  detail: FlowDetail;
  node: CanvasNode;
  connections: Array<Pick<Connection, "id" | "name" | "health">>;
  section: string;
  /** Called after any saved change so the page can refresh tags and the canvas. */
  changed: (node: CanvasNode, detail: StepDetail) => void;
  sectionChanged: (section: string) => void;
  executeTo: (node: CanvasNode) => void;
}

/** Fill the inspector panel for one step. */
export function renderInspector(panel: HTMLElement, scope: Tracker, context: InspectorContext): { rename: () => void } {
  const { detail, node } = context;
  const step = detail.steps.find((item) => item.nodeId === node.id) ?? { nodeId: node.id, fields: [], retry: { enabled: false, tries: 1, delayMs: 0 } };
  const view = nodeViews(detail.graph)[node.id];
  const flowId = detail.flow.id;

  const save = async (patch: Parameters<typeof api.updateStep>[2]): Promise<void> => {
    try {
      const result = await api.updateStep(flowId, node.id, patch);
      context.changed(result.node, result.detail);
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const head = el("div", "xwflow-row xwflow-gap-12");
  panel.append(head);
  scope.track(new XWFlowStepIcon(slot(head), { icon: view.icon, group: node.group }));
  const title = el("div", "xwflow-grow");
  head.append(title);
  title.append(el("h2", "xwflow-h3", node.name));
  const hint = el("span", "xwflow-xs xwflow-sec xwflow-row xwflow-gap-4");
  hint.append(fill(words.renameHint, { type: view.typeLabel }), " ");
  title.append(hint);
  scope.track(new XWUIKbd(slot(hint), { keys: words.renameKeys }, { size: "sm" }));

  const tabsHost = slot(panel, "xwflow-tabs");
  const body = el("div", "xwflow-stack xwflow-gap-16");
  panel.append(body);
  const tabs = scope.track(
    new XWUINavTabs(tabsHost, { tabs: words.sections.map((item) => ({ ...item })), activeTab: context.section }, { variant: "button", size: "sm", hideContent: "true" }),
  );

  let sectionOwned: Array<{ destroy(): void }> = [];
  const local: Tracker = { track: (item) => (sectionOwned.push(item), item) };
  scope.track({ destroy: () => sectionOwned.splice(0).forEach((item) => item.destroy()) });
  let nameInput: XWUIInputText | null = null;

  const show = (section: string): void => {
    sectionOwned.splice(0).forEach((item) => item.destroy());
    body.replaceChildren();
    nameInput = null;
    if (section === "params") renderParameters(body, local, step, context, save);
    if (section === "settings") nameInput = renderSettings(body, local, node, step, save);
    if (section === "notes") {
      local.track(new XWUIInputTextarea(slot(body), { label: words.notes, placeholder: words.notesPlaceholder, rows: 6 }, { fullWidth: true }));
    }
  };
  tabs.onChange((id) => {
    context.sectionChanged(id);
    show(id);
  });
  show(context.section);

  body.after(el("hr", "xwflow-sep"));
  const actions = el("div", "xwflow-wrap xwflow-gap-8");
  panel.append(actions);
  const pinned = node.state === "pinned";
  const pinHost = slot(actions);
  const pin = scope.track(new XWUIButton(pinHost, { text: pinned ? words.unpinOutput : words.pinOutput }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
  const pinKey = document.createElement("span");
  scope.track(new XWUIKbd(pinKey, { keys: words.pinKeys }, { size: "sm" }));
  pinHost.querySelector(".xwui-button")?.append(pinKey);
  pin.onClick(() => void save({ state: pinned ? "normal" : "pinned" }));
  const execute = scope.track(new XWUIButton(slot(actions), { text: words.executeTo }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
  execute.onClick(() => context.executeTo(node));

  return {
    rename: () => {
      if (!nameInput) {
        tabs.setActiveTab("settings");
        context.sectionChanged("settings");
        show("settings");
      }
      nameInput?.focus();
    },
  };
}

function renderParameters(
  body: HTMLElement,
  scope: Tracker,
  step: StepDetail,
  context: InspectorContext,
  save: (patch: Parameters<typeof api.updateStep>[2]) => Promise<void>,
): void {
  if (!step.fields.length) body.append(el("p", "xwflow-small xwflow-sec", words.noParameters));
  for (const field of step.fields) {
    const box = el("div", "xwflow-stack xwflow-gap-4");
    body.append(box);
    if (field.kind === "select") {
      const select = scope.track(
        new XWUISelect(slot(box), { label: field.label, value: field.value, options: (field.options ?? []).map((value) => ({ value, label: value })) }, { fullWidth: true }),
      );
      select.onChange((value) => void save({ fields: { [field.id]: String(value) } }));
    } else if (field.kind === "credential") {
      const select = scope.track(
        new XWUISelect(
          slot(box),
          { label: field.label, value: field.value, options: context.connections.map((item) => ({ value: item.id, label: item.name })) },
          { fullWidth: true },
        ),
      );
      select.onChange((value) => void save({ fields: { [field.id]: String(value) } }));
      const current = context.connections.find((item) => item.id === field.value);
      const hint = el("p", "xwflow-hint xwflow-row xwflow-gap-8");
      box.append(hint);
      if (current) {
        const tone = current.health === "healthy" ? "ok" : current.health === "expiring" ? "warn" : "err";
        const label = current.health === "healthy" ? words.connected : catalog.studio.connections.healthFilter[current.health];
        scope.track(new XWFlowStatus(slot(hint), { tone, label }, { size: "sm" }));
      }
      hint.append(words.valueHidden);
    } else {
      const input = scope.track(new XWUIInputText(slot(box), { label: field.label, value: field.value }, { fullWidth: true, className: "xwflow-mono-input" }));
      input.onChange(debounce((value: string) => void save({ fields: { [field.id]: value } }), config.searchDebounceMs * 3));
      if (field.expression) {
        const expression = el("div", "xwflow-row xwflow-gap-8");
        box.append(expression);
        mountTag(slot(expression), scope, { label: words.expression, color: "violet" });
        expression.append(el("span", "xwflow-mono xwflow-small", field.expression));
      }
      if (field.lastResult) {
        const hint = el("p", "xwflow-hint");
        hint.append(`${words.lastResult} `, el("span", "xwflow-mono xwflow-lime", field.lastResult));
        box.append(hint);
      }
    }
  }

  const retry = el("div", "xwflow-row xwflow-gap-12");
  body.append(retry);
  const toggle = scope.track(new XWUIInputSwitch(slot(retry), { checked: step.retry.enabled, label: "" }, { size: "sm", ariaLabel: words.retry }));
  toggle.onChange((checked) => void save({ retry: { enabled: checked, tries: checked ? Math.max(3, step.retry.tries) : 1, delayMs: checked ? Math.max(1000, step.retry.delayMs) : 0 } }));
  const text = el("div", "xwflow-grow");
  retry.append(text);
  text.append(
    el("b", "xwflow-small", words.retry),
    el(
      "div",
      "xwflow-xs xwflow-sec",
      step.retry.enabled ? fill(words.retryDetail, { tries: step.retry.tries, delay: formatMs(step.retry.delayMs) }) : words.retryOff,
    ),
  );
}

function renderSettings(
  body: HTMLElement,
  scope: Tracker,
  node: CanvasNode,
  _step: StepDetail,
  save: (patch: Parameters<typeof api.updateStep>[2]) => Promise<void>,
): XWUIInputText {
  const name = scope.track(new XWUIInputText(slot(body), { label: words.name, value: node.name }, { fullWidth: true }));
  name.onChange(
    debounce((value: string) => {
      if (value.trim()) void save({ name: value.trim() });
    }, config.searchDebounceMs * 3),
  );
  const enabled = el("div", "xwflow-row xwflow-gap-12");
  body.append(enabled);
  const toggle = scope.track(new XWUIInputSwitch(slot(enabled), { checked: node.state !== "disabled", label: "" }, { size: "sm", ariaLabel: words.enabled }));
  toggle.onChange((checked) => void save({ state: checked ? "normal" : "disabled" }));
  const text = el("div", "xwflow-grow");
  text.append(el("b", "xwflow-small", words.enabled), el("div", "xwflow-xs xwflow-sec", words.enabledDetail));
  enabled.append(text);
  return name;
}
