import { api } from "../../api/client";
import { fill, formatAgo } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, paths, replaceQuery, type Route } from "../../app/router";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { ProjectVariable, VariableScope } from "../../types/domain";
import { button, cell, glass, row, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText, XWUISelect } from "../../xwui";
import { projectHead } from "./common-view";

type VariablesRoute = Extract<Route, { page: "variables" }>;

const words = catalog.project.variables;
/** A table row needs its own unique `key`, which would hide the variable's name: the row keeps the variable whole. */
type Row = ProjectVariable & { variable: ProjectVariable };

const scopeHues: Record<VariableScope, Hue | undefined> = { all: undefined, production: "lime", test: "cyan" };

function table(variables: ProjectVariable[], remove: (variable: ProjectVariable) => void): Node {
  if (!variables.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
  const columns = words.columns;
  return glass(
    {
      tag: "xwui-table",
      data: {
        columns: [
          {
            key: "key",
            title: columns.key,
            render: (_: unknown, item: Row) =>
              cell(row([text("small", item.variable.key, { mono: true, bold: true }), ...(item.variable.secret ? [tag(words.secret, "pink", undefined, true)] : [])], { gap: 8 })),
          },
          {
            key: "value",
            title: columns.value,
            render: (_: unknown, item: Row) =>
              cell(item.value === null ? text("small", `•••••••• ${words.hidden}`, { mono: true, tone: "tertiary" }) : text("small", item.value, { mono: true, tone: "secondary" })),
          },
          { key: "scope", title: columns.scope, render: (_: unknown, item: Row) => cell(tag(words.scope[item.scope], scopeHues[item.scope])) },
          {
            key: "usedBy",
            title: columns.usedBy,
            align: "end",
            render: (_: unknown, item: Row) => cell(text("small", item.usedBy ? fill(item.usedBy === 1 ? words.usedByOne : words.usedBy, { n: item.usedBy }) : words.unused, { tone: item.usedBy ? undefined : "tertiary" })),
          },
          { key: "updatedAt", title: columns.updated, render: (_: unknown, item: Row) => cell(text("small", formatAgo(item.updatedAt), { tone: "secondary" })) },
          {
            key: "actions",
            title: columns.actions,
            align: "end",
            render: (_: unknown, item: Row) =>
              cell(button("ghost", "", { size: "sm", icon: "trash-2", label: fill(words.removeLabel, { key: item.variable.key }), disabled: item.usedBy > 0, onClick: () => remove(item.variable) })),
          },
        ],
        data: variables.map((item) => ({ ...item, variable: item, key: item.id })),
      },
      config: { hoverable: true, bordered: false, ariaLabel: words.tableLabel },
    },
    { pad: "none", scroll: true },
  );
}

export async function view(context: ViewContext<VariablesRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  const query = { scope: route.scope, q: route.q };
  let variables = await api.listVariables(query);

  const redraw = (): void => context.instance<XWUIComposer>("variables-table")?.setTree(table(variables, (item) => void remove(item)));
  const reload = async (): Promise<void> => {
    variables = await api.listVariables(query);
    redraw();
  };
  async function remove(item: ProjectVariable): Promise<void> {
    try {
      await api.deleteVariable(item.id);
      notify(fill(words.removed, { key: item.key }), "success");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  }
  const apply = (patch: Partial<typeof query>): void => {
    Object.assign(query, patch);
    replaceQuery(paths.variables, { scope: query.scope, q: query.q });
    void reload().catch((error) => notify(errorMessage(error, catalog.errors.load), "danger"));
  };

  const dialogWords = words.dialog;
  const fields: { key?: XWUIInputText; value?: XWUIInputText; secret?: { isChecked?(): boolean; getChecked?(): boolean }; scope?: XWUISelect; dialog?: { open(): void; close(): void } } = {};
  let secret = false;
  const add = async (): Promise<void> => {
    try {
      const added = await api.addVariable({
        key: fields.key?.getValue() ?? "",
        value: fields.value?.getValue() ?? "",
        secret,
        scope: (String(fields.scope?.getValue() ?? "all") || "all") as VariableScope,
      });
      notify(fill(dialogWords.added, { key: added.key }), "success");
      fields.dialog?.close();
      fields.key?.setValue("");
      fields.value?.setValue("");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }], sample: "data" },
    body: [
      ...projectHead(words.title, words.lead, "variables", [button("primary", words.add, { icon: "plus", onClick: () => setTimeout(() => fields.dialog?.open(), 0) })]),
      row(
        [
          {
            tag: "xwui-segmented-control",
            data: { value: query.scope },
            config: { options: words.environments.map((item) => ({ value: item.id, label: item.label })), ariaLabel: words.environmentLabel },
            ref: (instance) => (instance as { onChange?(handler: (value: string) => void): void }).onChange?.((value) => apply({ scope: value as VariableScope | "" })),
          },
          {
            tag: "xwui-box",
            config: { width: "100%" },
            slots: {
              children: {
                tag: "xwui-input-text",
                data: { value: query.q, placeholder: words.search },
                config: { type: "search", leadingIcon: "search", ariaLabel: words.search, fullWidth: true, clearable: true },
                ref: (instance) => (instance as XWUIInputText).onChange(debounce((value: string) => apply({ q: value.trim() }), config.searchDebounceMs)),
              },
            },
          },
        ],
        { gap: 12, wrap: true },
      ),
      { tag: "xwui-composer", key: "variables-table", data: { tree: table(variables, (item) => void remove(item)) } },
      {
        tag: "xwui-dialog",
        data: { title: dialogWords.title },
        config: { size: "medium", closable: true },
        slots: {
          content: stack(
            [
              { tag: "xwui-input-text", data: { label: dialogWords.key, placeholder: dialogWords.keyPlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (fields.key = i as XWUIInputText) },
              { tag: "xwui-input-text", data: { label: dialogWords.value, placeholder: dialogWords.valuePlaceholder }, config: { fullWidth: true }, ref: (i) => (fields.value = i as XWUIInputText) },
              {
                tag: "xwui-select",
                data: {
                  label: dialogWords.scope,
                  value: "all",
                  options: (["all", "production", "test"] as const).map((value) => ({ value, label: words.scope[value] })),
                },
                config: { fullWidth: true },
                ref: (i) => (fields.scope = i as XWUISelect),
              },
              row(
                [
                  {
                    tag: "xwui-switch",
                    data: { checked: false, label: "" },
                    config: { size: "sm", ariaLabel: dialogWords.secret },
                    ref: (i) => (i as { onChange(handler: (checked: boolean) => void): void }).onChange((checked) => (secret = checked)),
                  },
                  stack([text("small", dialogWords.secret, { bold: true }), text("xs", dialogWords.secretDetail, { tone: "secondary" })], { gap: 2 }),
                ],
                { gap: 12 },
              ),
            ],
            { gap: 16 },
          ),
          footer: row([button("glass", dialogWords.cancel, { onClick: () => fields.dialog?.close() }), button("primary", dialogWords.save, { onClick: () => void add() })], { justify: "flex-end" }),
        },
        ref: (instance) => (fields.dialog = instance as { open(): void; close(): void }),
      },
    ],
  };
}
