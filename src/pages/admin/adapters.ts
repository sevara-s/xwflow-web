import { api } from "../../api/client";
import { fill, formatAgo } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Adapter, ImportRecord } from "../../types/domain";
import { button, glass, grid, iconTile, row, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer } from "../../xwui";
import { pageHead, section } from "./console-view";

const words = catalog.console.adapters;

export async function view(context: ViewContext): Promise<PageResult> {
  let { adapters, imports } = await api.listAdapters();
  const names = new Map(adapters.map((adapter) => [adapter.id, adapter.name]));

  const history = (): Node =>
    imports.length
      ? stack(
          imports.map((record: ImportRecord) =>
            glass(
              row(
                [
                  stack(
                    [
                      row([text("small", record.file, { bold: true, mono: true }), tag(names.get(record.adapter) ?? record.adapter)], { gap: "s", wrap: true }),
                      text("xs", record.note ?? fill(words.flows, { n: record.flows }), { tone: "secondary" }),
                    ],
                    { gap: "xs" },
                  ),
                  row(
                    [
                      status(record.result === "ok" ? "success" : "warning", words.results[record.result]),
                      text("xs", formatAgo(record.at), { tone: "tertiary" }),
                      ...(record.flowId ? [button("ghost", words.openFlow, { size: "sm", icon: "arrow-right", iconAfter: true, onClick: () => navigate(paths.flow(record.flowId!)) })] : []),
                    ],
                    { gap: "m", wrap: true },
                  ),
                ],
                { justify: "space-between", wrap: true, gap: "m" },
              ),
              { pad: "s" },
            ),
          ),
          { gap: "m" },
        )
      : text("small", words.none, { tone: "secondary" });

  const runImport = async (adapter: Adapter): Promise<void> => {
    const trigger = context.instance<XWUIButton>(`import-${adapter.id}`);
    trigger?.setLoading(true);
    try {
      await api.runImport(adapter.id);
      ({ adapters, imports } = await api.listAdapters());
      context.instance<XWUIComposer>("import-history")?.setTree(history());
      notify(fill(words.imported, { name: names.get(adapter.id) ?? adapter.name }), "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      trigger?.setLoading(false);
    }
  };

  const card = (adapter: Adapter): Node =>
    glass(
      stack(
        [
          row([iconTile("plug", adapter.status === "preview" ? "amber" : "cyan"), tag(adapter.status === "preview" ? words.preview : words.available, adapter.status === "preview" ? "amber" : "lime")], { justify: "space-between" }),
          stack([text("h4", adapter.name, { level: 2 }), text("small", adapter.format, { tone: "secondary" })], { gap: "xs" }),
          row([button("glass", words.importSample, { size: "sm", icon: "download", key: `import-${adapter.id}`, onClick: () => void runImport(adapter) })]),
        ],
        { gap: "l" },
      ),
      { pad: "m" },
    );

  return {
    bar: adminBar(context.admin!, "admin", words.title),
    body: [
      ...pageHead(words.title, words.lead),
      grid(adapters.map(card), "card"),
      section(words.history, [{ tag: "xwui-composer", key: "import-history", data: { tree: history() } }]),
    ],
  };
}
