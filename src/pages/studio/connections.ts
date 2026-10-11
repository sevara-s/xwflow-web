import { api } from "../../api/client";
import { fill, formatAgo, formatDayMonth, formatIn, formatMs } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, paths, replaceQuery, type Route } from "../../app/router";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Connection, ConnectionHealth, ConnectionQuery, StatusTone } from "../../types/domain";
import { hueOf, toneOf } from "../../ui/flow";
import { button, decoration, grid, iconTile, row, space, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText, XWUISelect } from "../../xwui";
import { projectTabs } from "./common-view";

type ConnectionsRoute = Extract<Route, { page: "connections" }>;

const words = catalog.studio.connections;
const healthTones: Record<ConnectionHealth, StatusTone> = { healthy: "ok", expiring: "warn", broken: "err" };

function note(connection: Connection): { text: string; muted: boolean } {
  if (connection.health === "broken" && connection.brokenFlow) {
    const date = connection.expiresAt ? formatDayMonth(connection.expiresAt) : "";
    return { text: fill(words.brokenBody, { date, flow: connection.brokenFlow }), muted: false };
  }
  if (!connection.usedBy || connection.lastUsedAt === null) return { text: words.unused, muted: true };
  const template = connection.usedBy === 1 ? words.usedByOne : words.usedBy;
  return { text: fill(template, { n: connection.usedBy, when: formatAgo(connection.lastUsedAt).toLocaleLowerCase() }), muted: true };
}

function card(connection: Connection, reload: () => Promise<void>): Node {
  const label =
    connection.health === "expiring" && connection.expiresAt
      ? fill(words.health.expiring, { when: formatIn(connection.expiresAt) })
      : words.health[connection.health === "expiring" ? "healthy" : connection.health];
  const healthy = connection.health === "healthy";
  const action = async (): Promise<void> => {
    try {
      if (healthy) {
        const result = await api.testConnection(connection.id);
        if (result.ok) notify(fill(words.tested, { name: connection.name, ms: formatMs(result.latencyMs) }), "success");
        else notify(fill(words.testFailed, { name: connection.name }), "warning");
      } else {
        await api.reconnectConnection(connection.id);
        notify(fill(words.reconnected, { name: connection.name }), "success");
        await reload();
      }
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  const body = note(connection);
  return {
    tag: "xwui-box",
    config: { surface: "glass", padding: space("xl"), role: "group", ariaLabel: connection.name },
    slots: {
      children: stack(
        [
          row(
            [
              row(
                [
                  iconTile(words.apps[connection.app as keyof typeof words.apps]?.icon ?? "plug", hueOf[connection.group]),
                  stack([text("body", connection.name, { bold: true }), text("xs", fill(words.ownedBy, { auth: words.auth[connection.auth], owner: connection.owner.name }), { tone: "secondary" })], {
                    gap: "xs",
                  }),
                ],
                { gap: "m" },
              ),
              status(toneOf[healthTones[connection.health]], label),
            ],
            { justify: "space-between", wrap: true },
          ),
          { ...text("small", words.masked, { mono: true, tone: "tertiary" }), config: { ...text("small", words.masked, { mono: true, tone: "tertiary" }).config, ariaLabel: words.maskedLabel } },
          text("small", body.text, { tone: body.muted ? "secondary" : undefined }),
          row(
            [
              row([tag(connection.scopes.join(", ")), tag(connection.audience)], { wrap: true }),
              button(connection.health === "broken" ? "primary" : "glass", healthy ? words.test : words.reconnect, { size: "sm", onClick: () => void action() }),
            ],
            { justify: "space-between", wrap: true },
          ),
        ],
        { gap: "l" },
      ),
    },
  };
}

export async function view(context: ViewContext<ConnectionsRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  const query: ConnectionQuery = { q: route.q, health: route.health };
  let grouping: "connection" | "app" = "connection";
  let connections = await api.listConnections(query);

  const list = (): Node => {
    if (!connections.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
    const groups =
      grouping === "app"
        ? Object.entries(words.apps)
            .map(([app, meta]) => ({ title: meta.label, items: connections.filter((item) => item.app === app) }))
            .filter((group) => group.items.length)
        : [{ title: "", items: connections }];
    return stack(
      groups.map((group) => stack([...(group.title ? [text("h3", group.title)] : []), grid(group.items.map((item) => card(item, reload)), 360)], { gap: "m" })),
      { gap: "xl" },
    );
  };
  async function reload(): Promise<void> {
    connections = await api.listConnections(query);
    context.instance<XWUIComposer>("connection-list")?.setTree(list());
  }
  const apply = (patch: Partial<ConnectionQuery>): void => {
    Object.assign(query, patch);
    replaceQuery(paths.connections, { q: query.q, health: query.health });
    void reload().catch((error) => notify(errorMessage(error, catalog.errors.load), "danger"));
  };

  /* The add-connection dialog: XWUI fields inside an XWUIDialog. */
  const text_ = words.dialog;
  const fields: { name?: XWUIInputText; auth?: XWUISelect; audience?: XWUIInputText; dialog?: { open(): void; close(): void } } = {};
  const submit = async (): Promise<void> => {
    const value = fields.name?.getValue().trim() ?? "";
    if (!value) {
      notify(text_.required, "warning");
      fields.name?.focus();
      return;
    }
    try {
      const created = await api.addConnection({
        name: value,
        auth: String(fields.auth?.getValue() ?? "apiKey") as Connection["auth"],
        audience: fields.audience?.getValue().trim() || text_.audiencePlaceholder,
      });
      notify(fill(text_.added, { name: created.name }), "success");
      fields.dialog?.close();
      fields.name?.setValue("");
      fields.audience?.setValue("");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  const dialog: Node = {
    tag: "xwui-dialog",
    data: { title: text_.title },
    config: { size: "medium", closable: true },
    slots: {
      content: stack(
        [
          { tag: "xwui-input-text", data: { label: text_.name, placeholder: text_.namePlaceholder }, config: { fullWidth: true, required: true }, ref: (i) => (fields.name = i as XWUIInputText) },
          {
            tag: "xwui-select",
            data: { label: text_.auth, value: "apiKey", options: (Object.keys(words.auth) as Connection["auth"][]).map((value) => ({ value, label: words.auth[value] })) },
            config: { fullWidth: true },
            ref: (i) => (fields.auth = i as XWUISelect),
          },
          { tag: "xwui-input-text", data: { label: text_.audience, placeholder: text_.audiencePlaceholder }, config: { fullWidth: true }, ref: (i) => (fields.audience = i as XWUIInputText) },
        ],
        { gap: "l" },
      ),
      footer: row([button("glass", text_.cancel, { onClick: () => fields.dialog?.close() }), button("primary", text_.save, { onClick: () => void submit() })], { justify: "flex-end" }),
    },
    ref: (instance) => (fields.dialog = instance as { open(): void; close(): void }),
  };

  const select = (value: string, options: Array<{ value: string; label: string }>, label: string, onPick: (value: string) => void): Node => ({
    tag: "xwui-select",
    // XWUISelect reads an empty value as no choice, so the "any" option's label stands in as the placeholder.
    data: { value, options, placeholder: options.find((item) => item.value === "")?.label },
    config: { ariaLabel: label },
    ref: (instance) => (instance as XWUISelect).onChange((picked) => onPick(String(picked))),
  });
  const healths: ConnectionHealth[] = ["healthy", "expiring", "broken"];

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }], sample: "data" },
    body: [
      text("h2", words.title),
      projectTabs("connections", ["flows", "agents", "tables", "connections", "runs", "mcp"]),
      {
        tag: "xwui-box",
        config: { surface: "glass", padding: space("xl"), overflow: "clip" },
        slots: {
          children: row(
            [
              row(
                [
                  { tag: "xwui-box", config: { position: "relative", width: 96, height: 96 }, slots: { children: decoration("connections.orb") } },
                  stack([text("h3", words.vaultTitle), text("body", words.vaultBody, { tone: "secondary" })], { gap: "xs" }),
                ],
                { gap: "xl" },
              ),
              { ...button("primary", words.add, { icon: "plus", onClick: () => setTimeout(() => fields.dialog?.open(), 0) }) },
            ],
            { gap: "xl", wrap: true, justify: "space-between" },
          ),
        },
      },
      row(
        [
          {
            tag: "xwui-box",
            config: { width: "100%" },
            slots: {
              children: {
                tag: "xwui-input-text",
                data: { value: query.q ?? "", placeholder: words.search },
                config: { type: "search", leadingIcon: "search", ariaLabel: words.search, fullWidth: true, clearable: true },
                ref: (instance) => (instance as XWUIInputText).onChange(debounce((value: string) => apply({ q: value.trim() }), config.searchDebounceMs)),
              },
            },
          },
          select(query.health ?? "", [{ value: "", label: words.anyStatus }, ...healths.map((value) => ({ value, label: words.healthFilter[value] }))], words.statusLabel, (value) =>
            apply({ health: value as ConnectionHealth | "" }),
          ),
          select(grouping, words.views.map((item) => ({ ...item })), words.viewLabel, (value) => {
            grouping = value === "app" ? "app" : "connection";
            context.instance<XWUIComposer>("connection-list")?.setTree(list());
          }),
        ],
        { gap: "m", wrap: true },
      ),
      { tag: "xwui-composer", key: "connection-list", data: { tree: list() } },
      dialog,
    ],
  };
}

