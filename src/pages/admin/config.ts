import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { ConfigEntry } from "../../types/domain";
import { button, grid, row, separator, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIInputText } from "../../xwui";
import { pageHead, section } from "./console-view";

const words = catalog.console.config;
const sourceHue: Record<ConfigEntry["source"], Hue | undefined> = { file: undefined, env: "cyan", default: undefined, console: "lime" };

export async function view(context: ViewContext): Promise<PageResult> {
  const { entries } = await api.getConfig();
  const changed = new Map<string, string>();

  const save = async (): Promise<void> => {
    if (!changed.size) return notify(words.nothing, "info");
    try {
      await api.saveConfig(Object.fromEntries(changed));
      notify(changed.size === 1 ? words.savedOne : fill(words.saved, { n: changed.size }), "success");
      changed.clear();
    } catch (error) {
      const field = (error as { field?: { id: string; min: number; max: number } }).field;
      notify(field ? fill(words.outOfRange, { label: words.labels[field.id as keyof typeof words.labels] ?? field.id, min: field.min, max: field.max }) : errorMessage(error), "danger");
    }
  };

  const value = (entry: ConfigEntry): Node =>
    entry.editable
      ? {
          tag: "xwui-input-text",
          data: { value: String(entry.value) },
          config: { type: "number", ariaLabel: words.labels[entry.id as keyof typeof words.labels] ?? entry.id, size: "small" },
          ref: (instance) => (instance as XWUIInputText).onChange((next) => changed.set(entry.id, next)),
        }
      : text("small", String(entry.value), { mono: true });

  const line = (entry: ConfigEntry): Node =>
    row(
      [
        stack(
          [
            text("body", words.labels[entry.id as keyof typeof words.labels] ?? entry.id, { bold: true }),
            row(
              [
                tag(words.sources[entry.source], sourceHue[entry.source]),
                text("xs", entry.editable ? fill(words.range, { min: entry.min ?? 0, max: entry.max ?? 0 }) : words.readOnly, { tone: "tertiary" }),
              ],
              { gap: "s" },
            ),
          ],
          { gap: "xs" },
        ),
        value(entry),
      ],
      { justify: "space-between", gap: "l" },
    );

  const groups = (Object.keys(words.groups) as Array<ConfigEntry["group"]>).map((group) =>
    section(
      words.groups[group],
      entries.filter((entry) => entry.group === group).flatMap((entry, index) => [...(index ? [separator()] : []), line(entry)]),
      { pad: "l" },
    ),
  );

  return {
    bar: adminBar(context.admin!, "system", words.title, { actions: [button("primary", catalog.console.shared.save, { size: "sm", icon: "check", onClick: () => void save() })] }),
    body: [...pageHead(words.title, words.lead), grid(groups, 440)],
  };
}
