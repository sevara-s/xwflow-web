import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatAgo, formatDayMonth, formatIn, formatMs } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { paths, replaceQuery, type Route } from "../../app/router";
import { debounce } from "../../app/timing";
import { XWFlowConnectionCard } from "../../components/XWFlowConnectionCard/XWFlowConnectionCard";
import type { XWFlowConnectionCardData } from "../../components/XWFlowConnectionCard/XWFlowConnectionCard.types";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Connection, ConnectionHealth, ConnectionQuery, StatusTone } from "../../types/domain";
import { XWUIButton, XWUIDialog, XWUIEmpty, XWUIInputText, XWUISelect } from "../../xwui";
import { glass, heading, mountAppBar, mountProjectTabs, projectCrumb } from "./common";
import "./connections.css";

type ConnectionsRoute = Extract<Route, { page: "connections" }>;
type Owned = { destroy(): void };

const words = catalog.studio.connections;
const healthTones: Record<ConnectionHealth, StatusTone> = { healthy: "ok", expiring: "warn", broken: "err" };

export async function render(context: PageContext<ConnectionsRoute>): Promise<void> {
  const { route, scope, body } = context;
  const query: ConnectionQuery = { q: route.q, health: route.health };
  let view: "connection" | "app" = "connection";
  let connections = await api.listConnections(query);

  mountAppBar(context, [projectCrumb(context), { label: words.title }], { sample: "data" });

  const titleRow = el("div", "xwflow-row xwflow-gap-16 xwflow-wrap");
  body.append(titleRow);
  heading(titleRow, 1, "h2", words.title);
  mountProjectTabs(slot(titleRow, "xwflow-push"), scope, "connections", ["flows", "agents", "tables", "connections", "runs", "mcp"]);

  const vault = glass(body, { className: "xwflow-vault xwflow-clip" });
  const orbBox = el("div", "xwflow-vault__orb");
  vault.append(orbBox);
  scope.track(new XWFlowShape(slot(orbBox), { kind: "orb" }, { size: 96, color: "lime", place: { left: "0", top: "0" } }));
  const vaultText = el("div", "xwflow-stack xwflow-gap-4 xwflow-grow");
  vault.append(vaultText);
  heading(vaultText, 2, "h3", words.vaultTitle);
  vaultText.append(el("p", "xwflow-sec", words.vaultBody));
  const add = scope.track(new XWUIButton(slot(vault), { text: words.add }, { variant: "primary", icon: "plus" }));
  add.onClick(() => openAddDialog(scope, async () => reload()));

  const toolbar = el("div", "xwflow-toolbar");
  body.append(toolbar);
  const search = scope.track(
    new XWUIInputText(slot(toolbar, "xwflow-toolbar__search"), { value: query.q ?? "", placeholder: words.search }, {
      type: "search",
      leadingIcon: "search",
      ariaLabel: words.search,
      fullWidth: true,
      clearable: true,
    }),
  );
  search.onChange(debounce((value: string) => apply({ q: value.trim() }), config.searchDebounceMs));
  const healths: ConnectionHealth[] = ["healthy", "expiring", "broken"];
  const health = scope.track(
    new XWUISelect(
      slot(toolbar, "xwflow-toolbar__select"),
      {
        value: query.health ?? "",
        placeholder: words.anyStatus,
        options: [{ value: "", label: words.anyStatus }, ...healths.map((value) => ({ value, label: words.healthFilter[value] }))],
      },
      { ariaLabel: words.statusLabel },
    ),
  );
  health.onChange((value) => apply({ health: String(value) as ConnectionHealth | "" }));
  const grouping = scope.track(
    new XWUISelect(slot(toolbar, "xwflow-toolbar__select"), { value: view, options: words.views.map((item) => ({ ...item })) }, { ariaLabel: words.viewLabel }),
  );
  grouping.onChange((value) => {
    view = String(value) === "app" ? "app" : "connection";
    show();
  });

  const list = el("div", "xwflow-stack xwflow-gap-24");
  body.append(list);
  let owned: Owned[] = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  const tracker: Tracker = { track: (item) => (owned.push(item), item) };

  function show(): void {
    owned.splice(0).forEach((item) => item.destroy());
    list.replaceChildren();
    if (!connections.length) {
      tracker.track(new XWUIEmpty(slot(list), { icon: "search", title: words.empty.title, description: words.empty.description }));
      return;
    }
    const groups =
      view === "app"
        ? Object.entries(words.apps)
            .map(([app, meta]) => ({ title: meta.label, items: connections.filter((item) => item.app === app) }))
            .filter((group) => group.items.length)
        : [{ title: "", items: connections }];
    for (const group of groups) {
      const section = el("section", "xwflow-stack xwflow-gap-12");
      if (group.title) {
        section.setAttribute("aria-label", group.title);
        heading(section, 2, "h3", group.title);
      }
      const grid = el("div", "xwflow-grid");
      grid.style.setProperty("--xwflow-min", "360px");
      section.append(grid);
      list.append(section);
      for (const connection of group.items) mountCard(slot(grid), tracker, connection, reload);
    }
  }

  async function reload(): Promise<void> {
    connections = await api.listConnections(query);
    show();
  }

  function apply(patch: Partial<ConnectionQuery>): void {
    Object.assign(query, patch);
    replaceQuery(paths.connections, { q: query.q, health: query.health });
    void reload().catch((error) => notify(errorMessage(error, catalog.errors.load), "danger"));
  }

  show();
}

function cardData(connection: Connection): XWFlowConnectionCardData {
  const owner = connection.owner.name;
  const status =
    connection.health === "expiring" && connection.expiresAt
      ? fill(words.health.expiring, { when: formatIn(connection.expiresAt) })
      : words.health[connection.health === "expiring" ? "healthy" : connection.health];
  let note: XWFlowConnectionCardData["note"];
  if (connection.health === "broken" && connection.brokenFlow) {
    const date = connection.expiresAt ? formatDayMonth(connection.expiresAt) : "";
    note = { text: fill(words.brokenBody, { date, flow: connection.brokenFlow }), emphasis: connection.brokenFlow, muted: false };
  } else if (!connection.usedBy || connection.lastUsedAt === null) {
    note = { text: words.unused, muted: true };
  } else {
    const template = connection.usedBy === 1 ? words.usedByOne : words.usedBy;
    note = { text: fill(template, { n: connection.usedBy, when: formatAgo(connection.lastUsedAt).toLocaleLowerCase() }), muted: true };
  }
  return {
    name: connection.name,
    subtitle: fill(words.ownedBy, { auth: words.auth[connection.auth], owner }),
    icon: words.apps[connection.app as keyof typeof words.apps]?.icon ?? "plug",
    group: connection.group,
    status: { tone: healthTones[connection.health], label: status },
    mask: words.masked,
    maskLabel: words.maskedLabel,
    note,
    tags: [connection.scopes.join(", "), connection.audience],
    action: connection.health === "healthy" ? { label: words.test, primary: false } : { label: words.reconnect, primary: connection.health === "broken" },
  };
}

function mountCard(host: HTMLElement, scope: Tracker, connection: Connection, reload: () => Promise<void>): void {
  const card = scope.track(new XWFlowConnectionCard(host, cardData(connection)));
  card.on("action", async () => {
    try {
      if (connection.health === "healthy") {
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
  });
}

function openAddDialog(scope: Tracker, done: () => Promise<void>): void {
  const text = words.dialog;
  const form = el("form", "xwflow-stack xwflow-gap-16 xwflow-dialog-form");
  const footer = el("div", "xwflow-row xwflow-gap-8 xwflow-dialog-footer");
  const owned: Owned[] = [];
  const name = new XWUIInputText(slot(form), { label: text.name, placeholder: text.namePlaceholder }, { fullWidth: true, required: true });
  const auth = new XWUISelect(
    slot(form),
    { label: text.auth, value: "apiKey", options: (Object.keys(words.auth) as Connection["auth"][]).map((value) => ({ value, label: words.auth[value] })) },
    { fullWidth: true },
  );
  const audience = new XWUIInputText(slot(form), { label: text.audience, placeholder: text.audiencePlaceholder }, { fullWidth: true });
  owned.push(name, auth, audience);

  const dialog = new XWUIDialog(slot(document.body), { title: text.title, content: form, footer }, { size: "medium", closable: true });
  const cancel = new XWUIButton(slot(footer), { text: text.cancel }, { variant: "ghost", className: "xwflow-btn-glass" });
  const save = new XWUIButton(slot(footer), { text: text.save }, { variant: "primary", type: "submit" });
  owned.push(cancel, save, dialog);
  const close = (): void => {
    dialog.close();
    setTimeout(() => owned.splice(0).forEach((item) => item.destroy()), 300);
  };
  cancel.onClick(close);
  const submit = async (): Promise<void> => {
    const value = name.getValue().trim();
    if (!value) {
      notify(text.required, "warning");
      name.focus();
      return;
    }
    try {
      const created = await api.addConnection({
        name: value,
        auth: String(auth.getValue() ?? "apiKey") as Connection["auth"],
        audience: audience.getValue().trim() || text.audiencePlaceholder,
      });
      notify(fill(text.added, { name: created.name }), "success");
      close();
      await done();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  save.onClick(() => void submit());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit();
  });
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  // Open on the next frame so the click that asked for it cannot reach the new backdrop.
  setTimeout(() => dialog.open(), 0);
}
