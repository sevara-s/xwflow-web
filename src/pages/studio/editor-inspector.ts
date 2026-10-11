import { api } from "../../api/client";
import { fill, formatMs } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { debounce } from "../../app/timing";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { CanvasNode, Connection, FlowDetail, StepDetail } from "../../types/domain";
import { hueOf, stepType } from "../../ui/flow";
import { button, iconTile, keys, row, separator, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIInputText } from "../../xwui";

const words = catalog.studio.editor;

type StepPatch = Parameters<typeof api.updateStep>[2];

export interface InspectorContext {
  detail: FlowDetail;
  node: CanvasNode;
  connections: Array<Pick<Connection, "id" | "name" | "health">>;
  section: string;
  /** Called after any saved change so the page can refresh tags and the canvas. */
  changed: (node: CanvasNode, detail: StepDetail) => void;
  sectionChanged: (section: string) => void;
  executeTo: (node: CanvasNode) => void;
  /** Redraw the section body (the inspector's own nested composer). */
  showSection: (body: Node) => void;
  /** Receives the name field while the settings section is on screen. */
  nameField: (input: XWUIInputText | null) => void;
}

type Changeable = { onChange(handler: (value: never) => void): void };

/** A labelled switch row: the switch, then a bold title over a short detail. */
function switchRow(checked: boolean, title: string, detail: string, onChange: (checked: boolean) => void): Node {
  return row(
    [
      { tag: "xwui-switch", data: { checked, label: "" }, config: { size: "sm", ariaLabel: title }, ref: (instance) => (instance as Changeable).onChange(onChange as never) },
      stack([text("small", title, { bold: true }), text("xs", detail, { tone: "secondary" })], { gap: "xs" }),
    ],
    { gap: "m" },
  );
}

function parameters(step: StepDetail, context: InspectorContext, save: (patch: StepPatch) => Promise<void>): Node {
  const fields: Node[] = step.fields.map((field) => {
    if (field.kind === "select" || field.kind === "credential") {
      const options =
        field.kind === "select" ? (field.options ?? []).map((value) => ({ value, label: value })) : context.connections.map((item) => ({ value: item.id, label: item.name }));
      const parts: Node[] = [
        {
          tag: "xwui-select",
          data: { label: field.label, value: field.value, options },
          config: { fullWidth: true },
          ref: (instance) => (instance as Changeable).onChange(((value: unknown) => void save({ fields: { [field.id]: String(value) } })) as never),
        },
      ];
      const current = field.kind === "credential" ? context.connections.find((item) => item.id === field.value) : undefined;
      if (field.kind === "credential") {
        parts.push(
          row(
            [
              ...(current
                ? [
                    status(
                      current.health === "healthy" ? "success" : current.health === "expiring" ? "warning" : "error",
                      current.health === "healthy" ? words.connected : catalog.studio.connections.healthFilter[current.health],
                    ),
                  ]
                : []),
              text("xs", words.valueHidden, { tone: "secondary" }),
            ],
            { gap: "s", wrap: true },
          ),
        );
      }
      return stack(parts, { gap: "s" });
    }
    return stack(
      [
        {
          tag: "xwui-input-text",
          data: { label: field.label, value: field.value },
          config: { fullWidth: true },
          ref: (instance) => (instance as XWUIInputText).onChange(debounce((value: string) => void save({ fields: { [field.id]: value } }), config.searchDebounceMs * 3)),
        },
        ...(field.expression ? [row([tag(words.expression, "violet"), text("small", field.expression, { mono: true })], { gap: "s", wrap: true })] : []),
        ...(field.lastResult ? [row([text("xs", words.lastResult, { tone: "secondary" }), text("xs", field.lastResult, { mono: true, tone: "lime" })], { gap: "s" })] : []),
      ],
      { gap: "s" },
    );
  });
  return stack(
    [
      ...(fields.length ? fields : [text("small", words.noParameters, { tone: "secondary" })]),
      switchRow(
        step.retry.enabled,
        words.retry,
        step.retry.enabled ? fill(words.retryDetail, { tries: step.retry.tries, delay: formatMs(step.retry.delayMs) }) : words.retryOff,
        (checked) =>
          void save({ retry: { enabled: checked, tries: checked ? Math.max(3, step.retry.tries) : 1, delayMs: checked ? Math.max(1000, step.retry.delayMs) : 0 } }),
      ),
    ],
    { gap: "l" },
  );
}

function settings(node: CanvasNode, context: InspectorContext, save: (patch: StepPatch) => Promise<void>): Node {
  return stack(
    [
      {
        tag: "xwui-input-text",
        data: { label: words.name, value: node.name },
        config: { fullWidth: true },
        ref: (instance) => {
          const input = instance as XWUIInputText;
          context.nameField(input);
          input.onChange(
            debounce((value: string) => {
              if (value.trim()) void save({ name: value.trim() });
            }, config.searchDebounceMs * 3),
          );
        },
      },
      switchRow(node.state !== "disabled", words.enabled, words.enabledDetail, (checked) => void save({ state: checked ? "normal" : "disabled" })),
    ],
    { gap: "l" },
  );
}

/** The body of one inspector section. */
export function inspectorSection(section: string, context: InspectorContext): Node {
  const { detail, node } = context;
  const step = detail.steps.find((item) => item.nodeId === node.id) ?? { nodeId: node.id, fields: [], retry: { enabled: false, tries: 1, delayMs: 0 } };
  const save = async (patch: StepPatch): Promise<void> => {
    try {
      const result = await api.updateStep(detail.flow.id, node.id, patch);
      context.changed(result.node, result.detail);
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  context.nameField(null);
  if (section === "settings") return settings(node, context, save);
  if (section === "notes") {
    return { tag: "xwui-textarea", data: { label: words.notes, placeholder: words.notesPlaceholder, rows: 6 }, config: { fullWidth: true } };
  }
  return parameters(step, context, save);
}

/** The inspector panel for one step, as XWUI nodes. */
export function inspector(context: InspectorContext): Node {
  const { node } = context;
  const type = stepType(node.type, node.group);
  const pinned = node.state === "pinned";
  return stack(
    [
      row(
        [
          iconTile(type.icon, hueOf[node.group]),
          stack([text("h3", node.name), row([text("xs", fill(words.renameHint, { type: type.label }), { tone: "secondary" }), keys(words.renameKeys.split(" "), "sm")], { gap: "s" })], {
            gap: "xs",
          }),
        ],
        { gap: "m" },
      ),
      {
        tag: "xwui-tabs",
        key: "inspector-tabs",
        data: { tabs: words.sections.map((item) => ({ ...item })), activeTab: context.section },
        config: { variant: "button", size: "sm", contentMode: "hidden" },
        ref: (instance) =>
          (instance as { onChange(handler: (id: string) => void): void }).onChange((id) => {
            context.sectionChanged(id);
            context.showSection(inspectorSection(id, context));
          }),
      },
      { tag: "xwui-composer", key: "inspector-section", data: { tree: inspectorSection(context.section, context) } },
      separator(),
      row(
        [
          row([button("glass", pinned ? words.unpinOutput : words.pinOutput, { size: "sm", key: "inspector-pin", onClick: () => void pinToggle(context) }), keys([words.pinKeys], "sm")], {
            gap: "s",
          }),
          button("glass", words.executeTo, { size: "sm", onClick: () => context.executeTo(node) }),
        ],
        { gap: "s", wrap: true },
      ),
    ],
    { gap: "l" },
  );
}

/** Pin or unpin the step's output (the inspector's button and the P key). */
export async function pinToggle(context: Pick<InspectorContext, "detail" | "node" | "changed">): Promise<void> {
  try {
    const result = await api.updateStep(context.detail.flow.id, context.node.id, { state: context.node.state === "pinned" ? "normal" : "pinned" });
    context.changed(result.node, result.detail);
  } catch (error) {
    notify(errorMessage(error), "danger");
  }
}
