import { api } from "../../api/client";
import { fill, formatAgo, formatDayMonth, formatList, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, paths, replaceQuery, type Route } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { DataColumn, DataTable, DataTableSummary } from "../../types/domain";
import { button, cell, glass, iconTile, row, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";
import { projectHead } from "./common-view";

type TablesRoute = Extract<Route, { page: "tables" }>;

const words = catalog.project.tables;
const typeHues: Record<DataColumn["type"], Hue> = { text: "cyan", number: "lime", choice: "violet", date: "orange" };
const tierHues: Record<string, Hue> = { gold: "amber", silver: "cyan", bronze: "orange" };

function display(column: DataColumn, value: string | number | undefined): Node {
  if (value === undefined) return text("small", "", { tone: "tertiary" });
  if (column.type === "date") return text("small", formatDayMonth(Number(value)), { tone: "secondary" });
  if (column.type === "number") return text("small", formatNumber(Number(value)), { mono: true });
  if (column.type === "choice") return tag(String(value), tierHues[String(value)]);
  return text("small", String(value));
}

function toCsv(table: DataTable): string {
  const escape = (value: unknown): string => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [table.columns.map((column) => escape(column.label)).join(","), ...table.records.map((record) => table.columns.map((column) => escape(record[column.key])).join(","))].join("\n");
}

function picker(tables: DataTableSummary[], selected: string, pick: (id: string) => void): Node {
  return stack(
    tables.map((table) => ({
      tag: "xwui-box",
      config: { surface: "glass", padding: 16, gradientBorder: table.id === selected, hoverLift: table.id !== selected, role: "button", ariaLabel: table.name },
      on: { click: () => pick(table.id) },
      slots: {
        children: stack(
          [
            row([iconTile("table", table.hue, "sm"), text("body", table.name, { bold: true })], { gap: 10 }),
            text("xs", table.description, { tone: "secondary" }),
            row([tag(fill(words.rows, { n: formatNumber(table.rowCount) })), tag(fill(words.columns, { n: table.columnCount }))], { gap: 6 }),
          ],
          { gap: 8 },
        ),
      },
    })),
    { gap: 12 },
  );
}

function detail(table: DataTable): Node {
  const exportCsv = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(toCsv(table));
      notify(fill(words.exported, { name: table.name }), "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  return stack(
    [
      row(
        [
          stack(
            [
              text("h3", table.name),
              text("small", table.usedBy.length ? fill(words.usedBy, { flows: formatList(table.usedBy) }) : words.unused, { tone: "secondary" }),
            ],
            { gap: 4 },
          ),
          button("glass", words.export, { size: "sm", icon: "download", onClick: () => void exportCsv() }),
        ],
        { justify: "space-between", wrap: true },
      ),
      row(
        table.columns.map((column) => tag(column.label, typeHues[column.type], words.columnTypes[column.type])),
        { gap: 6, wrap: true },
      ),
      glass(
        {
          tag: "xwui-table",
          data: {
            columns: table.columns.map((column, index) => ({
              key: column.key,
              title: column.label,
              align: column.type === "number" ? "end" : undefined,
              render: (value: string | number) => cell(index === 0 ? text("small", String(value), { bold: true }) : display(column, value)),
            })),
            data: table.records.map((record, index) => ({ ...record, key: `${table.id}-${index}` })),
          },
          config: { hoverable: true, bordered: false, ariaLabel: fill(words.tableLabel, { name: table.name }) },
        },
        { pad: "none", scroll: true },
      ),
      row(
        [
          text("xs", fill(words.previewNote, { shown: table.records.length, total: formatNumber(table.rowCount) }), { tone: "tertiary" }),
          text("xs", fill(words.updated, { when: formatAgo(table.updatedAt).toLocaleLowerCase() }), { tone: "tertiary" }),
        ],
        { justify: "space-between", wrap: true },
      ),
    ],
    { gap: 14 },
  );
}

export async function view(context: ViewContext<TablesRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  const tables = await api.listTables();
  let selected = tables.some((table) => table.id === route.table) ? route.table! : tables[0]?.id ?? "";
  const first = selected ? await api.getTable(selected) : null;

  const pick = async (id: string): Promise<void> => {
    if (id === selected) return;
    selected = id;
    replaceQuery(paths.tables, { table: id });
    context.instance<XWUIComposer>("tables-picker")?.setTree(picker(tables, selected, (next) => void pick(next)));
    try {
      context.instance<XWUIComposer>("tables-detail")?.setTree(detail(await api.getTable(id)));
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  };

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }], sample: "rows" },
    body: [
      ...projectHead(words.title, words.lead, "tables"),
      {
        tag: "xwui-grid",
        // One column on a phone, then the picker beside a twice-as-wide table.
        // minmax(0, ...) lets the rows scroll inside their panel instead of widening the page.
        config: { columns: "minmax(0, 1fr)", gap: "24px", alignItems: "start", responsive: { lg: { columns: "minmax(0, 1fr) minmax(0, 2fr)" } } },
        slots: {
          children: [
            { tag: "xwui-composer", key: "tables-picker", data: { tree: picker(tables, selected, (id) => void pick(id)) } },
            glass({ tag: "xwui-composer", key: "tables-detail", data: { tree: first ? detail(first) : stack([], { gap: 0 }) } }, { pad: "m", scroll: true }),
          ],
        },
      },
    ],
  };
}
