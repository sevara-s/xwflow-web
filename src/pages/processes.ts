import { createProcess, listProcesses } from "../api/client";
import { appConfig } from "../config";
import { catalog, statusBadgeTones, statusLabel } from "../content/catalog";
import { debounce, formatVersion, formatWhen } from "../app/format";
import { MountScope } from "../app/mount";
import { errorMessage, notify } from "../app/notify";
import { navigate, onQueryChange, processPath, replaceQuery } from "../app/router";
import { XWUIButton, XWUIDataTable, XWUIDialog, XWUIEmpty, XWUIInputText, XWUIInputTextarea, XWUIPageHeader } from "../xwui";

export async function renderProcesses(slot: HTMLElement, scope: MountScope, query: string): Promise<void> {
  slot.replaceChildren();
  const header = scope.host();
  const tools = scope.host("xwflow-toolbar");
  const searchHost = scope.host();
  const createHost = scope.host();
  const tableHost = scope.host();
  tools.append(searchHost, createHost);
  slot.append(header, tools, tableHost);

  scope.track(
    new XWUIPageHeader(header, {
      title: catalog.processes.title,
      subtitle: catalog.processes.subtitle,
    }),
  );
  const search = scope.track(
    new XWUIInputText(searchHost, {
      label: catalog.processes.searchLabel,
      placeholder: catalog.processes.searchPlaceholder,
      value: query,
      variant: "outline",
    }),
  );
  search.onChange(debounce(appConfig.searchDebounceMs, (value) => {
    replaceQuery(catalog.paths.processes, { q: value.trim() });
  }));
  const create = scope.track(new XWUIButton(createHost, { text: catalog.processes.create }, { variant: "primary" }));
  create.onClick(() => openCreateProcess(scope, () => replaceQuery(catalog.paths.processes, { q: "" })));

  const table = { current: new MountScope() };
  scope.track({ destroy: () => table.current.destroy() });

  let requestToken = 0;
  const load = async (q: string) => {
    const request = ++requestToken;
    const processes = await listProcesses({ q });
    if (request !== requestToken) return;
    table.current.destroy();
    table.current = new MountScope();
    tableHost.replaceChildren();
    if (!processes.length) {
      table.current.track(
        new XWUIEmpty(tableHost, {
          icon: "inbox",
          title: catalog.processes.emptyTitle,
          description: catalog.processes.emptyDescription,
        }),
      );
      return;
    }
    table.current.track(
      new XWUIDataTable(tableHost, {
        columns: [
          { key: "name", title: catalog.processes.columns.name, subtitle: (row: { description: string }) => row.description },
          { key: "state", title: catalog.processes.columns.state, type: "badge", badge: { tones: statusBadgeTones() } },
          { key: "version", title: catalog.processes.columns.version },
          { key: "steps", title: catalog.processes.columns.steps },
          { key: "owner", title: catalog.processes.columns.owner },
          { key: "updated", title: catalog.processes.columns.updated },
        ],
        rows: processes.map((process) => ({
          id: process.id,
          name: process.name,
          description: process.description,
          state: statusLabel(process.state),
          version: formatVersion(process.latestVersion),
          steps: process.stepCount,
          owner: process.owner,
          updated: formatWhen(process.updatedAt),
        })),
        actions: [{ id: "open", label: catalog.processes.open, onClick: (row: { id: string }) => navigate(processPath(row.id)) }],
      }),
    );
  };
  onQueryChange((route) => {
    if (route.name === "processes") void load(route.q);
  }, scope);
  await load(query);
}

export function openCreateProcess(scope: MountScope, onCreated: () => void): void {
  const content = document.createElement("div");
  content.className = "xwflow-panel";
  const nameHost = document.createElement("div");
  const descriptionHost = document.createElement("div");
  content.append(nameHost, descriptionHost);
  const footer = document.createElement("div");
  footer.className = "xwflow-dialog-actions";
  const cancelHost = document.createElement("div");
  const submitHost = document.createElement("div");
  footer.append(cancelHost, submitHost);

  const dialog = scope.track(
    new XWUIDialog(document.body, {
      title: catalog.createDialog.title,
      content,
      footer,
    }),
  );
  const name = scope.track(
    new XWUIInputText(nameHost, {
      label: catalog.createDialog.nameLabel,
      placeholder: catalog.createDialog.namePlaceholder,
      variant: "outline",
    }),
  );
  const description = scope.track(
    new XWUIInputTextarea(descriptionHost, {
      label: catalog.createDialog.descriptionLabel,
      placeholder: catalog.createDialog.descriptionPlaceholder,
      variant: "outline",
      fullWidth: true,
      rows: 3,
    }),
  );
  const cancel = scope.track(new XWUIButton(cancelHost, { text: catalog.createDialog.cancel }));
  cancel.onClick(() => dialog.close());
  const submit = scope.track(new XWUIButton(submitHost, { text: catalog.createDialog.submit }, { variant: "primary" }));
  submit.onClick(() => {
    const trimmed = name.getValue().trim();
    if (!trimmed) {
      notify(catalog.createDialog.nameRequired, "warning");
      return;
    }
    void createProcess({ name: trimmed, description: description.getValue() })
      .then((process) => {
        dialog.close();
        notify(catalog.process.saved, "success");
        navigate(processPath(process.id));
        onCreated();
      })
      .catch((error: unknown) => notify(errorMessage(error), "danger"));
  });
  dialog.open();
}
