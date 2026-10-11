import { api } from "../../api/client";
import { fill, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, paths } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { McpServer, McpStatus } from "../../types/domain";
import { button, glass, grid, iconTile, row, stack, status, tag, text, type Node, type StatusTone } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText } from "../../xwui";
import { projectHead } from "./common-view";

const words = catalog.project.mcp;
const tones: Record<McpStatus, StatusTone> = { connected: "success", error: "error", disabled: "disabled" };

function card(server: McpServer, act: (server: McpServer, enabled: boolean) => void): Node {
  const action =
    server.status === "connected"
      ? button("glass", words.disable, { size: "sm", icon: "power", onClick: () => act(server, false) })
      : button("primary", server.status === "error" ? words.reconnect : words.enable, {
          size: "sm",
          icon: server.status === "error" ? "refresh-cw" : "power",
          onClick: () => act(server, true),
        });
  return glass(
    stack(
      [
        row(
          [
            row([iconTile("server", server.hue), stack([text("body", server.name, { bold: true }), text("xs", server.url, { mono: true, tone: "tertiary" })], { gap: "xs" })], { gap: "m" }),
            status(tones[server.status], words.status[server.status]),
          ],
          { justify: "space-between", wrap: true },
        ),
        ...(server.lastError ? [{ tag: "xwui-alert", data: { message: server.lastError }, config: { variant: "error" } } satisfies Node] : []),
        row(
          [
            tag(words.transport[server.transport], "violet"),
            tag(fill(words.tools, { n: server.tools.length })),
            tag(fill(words.calls, { n: formatNumber(server.calls24h) })),
            tag(server.latencyMs === null ? words.noLatency : fill(words.latency, { ms: server.latencyMs })),
          ],
          { gap: "s", wrap: true },
        ),
        server.tools.length ? row(server.tools.map((tool) => ({ tag: "xwui-kbd", data: { keys: [tool] }, config: { size: "sm" } })), { gap: "s", wrap: true }) : stack([], { gap: "none" }),
        row([action], { gap: "s" }),
      ],
      { gap: "l" },
    ),
    { pad: "m", glow: server.status === "connected" ? "violet" : undefined },
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const { workspace } = context;
  let servers = await api.listMcpServers();

  const cards = (): Node => grid(servers.map((server) => card(server, (item, enabled) => void act(item, enabled))), 340);
  const reload = async (): Promise<void> => {
    servers = await api.listMcpServers();
    context.instance<XWUIComposer>("mcp-cards")?.setTree(cards());
  };
  async function act(server: McpServer, enabled: boolean): Promise<void> {
    try {
      await api.setMcpServerEnabled(server.id, enabled);
      notify(fill(enabled ? words.enabled : words.disabled, { name: server.name }), enabled ? "success" : "info");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  }

  const dialogWords = words.dialog;
  const fields: { name?: XWUIInputText; url?: XWUIInputText; dialog?: { open(): void; close(): void } } = {};
  const add = async (): Promise<void> => {
    try {
      const server = await api.addMcpServer({ name: fields.name?.getValue() ?? "", url: (fields.url?.getValue() ?? "").trim() });
      notify(fill(dialogWords.added, { name: server.name }), "success");
      fields.dialog?.close();
      fields.name?.setValue("");
      fields.url?.setValue("");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }], sample: "data" },
    body: [
      ...projectHead(words.title, words.lead, "mcp", [button("primary", words.add, { icon: "plus", onClick: () => setTimeout(() => fields.dialog?.open(), 0) })]),
      { tag: "xwui-composer", key: "mcp-cards", data: { tree: cards() } },
      {
        tag: "xwui-dialog",
        data: { title: dialogWords.title },
        config: { size: "medium", closable: true },
        slots: {
          content: stack(
            [
              { tag: "xwui-input-text", data: { label: dialogWords.name, placeholder: dialogWords.namePlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (fields.name = i as XWUIInputText) },
              { tag: "xwui-input-text", data: { label: dialogWords.url, placeholder: dialogWords.urlPlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (fields.url = i as XWUIInputText) },
            ],
            { gap: "l" },
          ),
          footer: row([button("glass", dialogWords.cancel, { onClick: () => fields.dialog?.close() }), button("primary", dialogWords.save, { onClick: () => void add() })], { justify: "flex-end" }),
        },
        ref: (instance) => (fields.dialog = instance as { open(): void; close(): void }),
      },
    ],
  };
}
