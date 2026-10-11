import { api } from "../../api/client";
import { formatAgo, formatMs } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import { adminBar } from "../../app/shells/admin-view";
import { runStatusView } from "../../app/status";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Execution, RunStatus } from "../../types/domain";
import { toneOf } from "../../ui/flow";
import { button, cell, glass, row, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText } from "../../xwui";
import { choice, pageHead } from "./console-view";

const words = catalog.console.executions;

export async function view(context: ViewContext): Promise<PageResult> {
  const query: { q?: string; tenant?: string; status?: RunStatus | "" } = {};
  let { runs, tenants } = await api.listExecutions(query);

  async function reload(): Promise<void> {
    try {
      ({ runs, tenants } = await api.listExecutions(query));
      context.instance<XWUIComposer>("execution-table")?.setTree(table());
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  }

  const c = words.columns;
  const table = (): Node =>
    runs.length
      ? glass(
          {
            tag: "xwui-table",
            data: {
              columns: [
                { key: "id", title: c.run, render: (_: unknown, run: Execution) => cell(text("small", run.id, { mono: true })) },
                { key: "tenant", title: c.tenant, render: (_: unknown, run: Execution) => cell(run.own ? text("small", run.tenant, { bold: true }) : row([text("small", run.tenant), tag(words.otherTenant)], { gap: "s" })) },
                { key: "flowName", title: c.flow, render: (_: unknown, run: Execution) => cell(text("small", run.flowName)) },
                {
                  key: "status",
                  title: c.status,
                  render: (_: unknown, run: Execution) => {
                    const view = runStatusView(run.status);
                    return cell(status(toneOf[view.tone], view.label));
                  },
                },
                { key: "startedAt", title: c.started, render: (_: unknown, run: Execution) => cell(text("small", formatAgo(run.startedAt), { tone: "secondary" })) },
                { key: "durationMs", title: c.duration, align: "end", render: (_: unknown, run: Execution) => cell(text("small", run.durationMs === null ? catalog.console.shared.noValue : formatMs(run.durationMs), { mono: true })) },
                {
                  key: "action",
                  title: c.action,
                  ariaLabel: catalog.console.shared.open,
                  align: "end",
                  render: (_: unknown, run: Execution) => (run.own ? cell(button("glass", catalog.console.shared.open, { size: "sm", onClick: () => navigate(paths.run(run.id)) })) : ""),
                },
              ],
              data: runs.map((run) => ({ ...run, key: run.id })),
            },
            config: { hoverable: true, bordered: false, ariaLabel: words.title },
          },
          { pad: "none", scroll: true },
        )
      : { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };

  return {
    bar: adminBar(context.admin!, "system", words.title),
    body: [
      ...pageHead(words.title, words.lead),
      row(
        [
          {
            tag: "xwui-input-text",
            data: { placeholder: words.search },
            config: { type: "search", leadingIcon: "search", ariaLabel: words.search, clearable: true },
            ref: (instance) =>
              (instance as XWUIInputText).onChange(
                debounce((value: string) => {
                  query.q = value.trim();
                  void reload();
                }, config.searchDebounceMs),
              ),
          },
          choice("", [{ value: "", label: words.anyTenant }, ...tenants.map((name) => ({ value: name, label: name }))], c.tenant, (value) => {
            query.tenant = value;
            void reload();
          }),
          choice("", [{ value: "", label: catalog.console.shared.anyStatus }, ...(Object.keys(words.statuses) as RunStatus[]).map((value) => ({ value, label: words.statuses[value] }))], c.status, (value) => {
            query.status = value as RunStatus | "";
            void reload();
          }),
        ],
        { gap: "m", wrap: true },
      ),
      { tag: "xwui-composer", key: "execution-table", data: { tree: table() } },
    ],
  };
}
