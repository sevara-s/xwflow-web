import { listRuns } from "../api/client";
import { appConfig } from "../config";
import { catalog, statusBadgeTones, statusLabel } from "../content/catalog";
import { debounce, formatVersion, formatWhen } from "../app/format";
import { MountScope } from "../app/mount";
import { navigate, onQueryChange, replaceQuery, runPath } from "../app/router";
import type { RunStatus } from "../types/domain";
import { XWUIDataTable, XWUIEmpty, XWUIInputText, XWUIPageHeader, XWUISelect } from "../xwui";

const statuses = Object.keys(catalog.status).filter((key) =>
  key === "queued" || key === "running" || key === "succeeded" || key === "failed",
) as RunStatus[];

export async function renderRuns(
  slot: HTMLElement,
  scope: MountScope,
  query: string,
  status: RunStatus | "",
): Promise<void> {
  slot.replaceChildren();
  const header = scope.host();
  const tools = scope.host("xwflow-toolbar");
  const searchHost = scope.host();
  const statusHost = scope.host();
  const tableHost = scope.host();
  tools.append(searchHost, statusHost);
  slot.append(header, tools, tableHost);

  scope.track(new XWUIPageHeader(header, { title: catalog.runs.title, subtitle: catalog.runs.subtitle }));
  const search = scope.track(
    new XWUIInputText(searchHost, {
      label: catalog.runs.searchLabel,
      placeholder: catalog.runs.searchPlaceholder,
      value: query,
      variant: "outline",
    }),
  );
  const statusSelect = scope.track(
    new XWUISelect(statusHost, {
      label: catalog.runs.statusLabel,
      value: status,
      options: [
        { value: "", label: catalog.runs.allStatuses },
        ...statuses.map((value) => ({ value, label: statusLabel(value) })),
      ],
    }),
  );

  const apply = (nextQuery: string, nextStatus: RunStatus | "") => {
    replaceQuery(catalog.paths.runs, { q: nextQuery.trim(), status: nextStatus });
  };
  search.onChange(debounce(appConfig.searchDebounceMs, (value) => apply(value, currentStatus())));
  statusSelect.onChange((value) => {
    const next = typeof value === "string" && statuses.includes(value as RunStatus) ? (value as RunStatus) : "";
    apply(search.getValue(), next);
  });

  const currentStatus = (): RunStatus | "" => {
    const value = statusSelect.getValue();
    return typeof value === "string" && statuses.includes(value as RunStatus) ? (value as RunStatus) : "";
  };

  const table = { current: new MountScope() };
  scope.track({ destroy: () => table.current.destroy() });
  let requestToken = 0;

  const load = async (q: string, nextStatus: RunStatus | "") => {
    const request = ++requestToken;
    const runs = await listRuns({ q, status: nextStatus });
    if (request !== requestToken) return;
    table.current.destroy();
    table.current = new MountScope();
    tableHost.replaceChildren();
    if (!runs.length) {
      table.current.track(
        new XWUIEmpty(tableHost, {
          icon: "inbox",
          title: catalog.runs.emptyTitle,
          description: catalog.runs.emptyDescription,
        }),
      );
      return;
    }
    table.current.track(
      new XWUIDataTable(tableHost, {
        columns: [
          { key: "id", title: catalog.runs.columns.id },
          { key: "process", title: catalog.runs.columns.process },
          { key: "version", title: catalog.runs.columns.version },
          { key: "status", title: catalog.runs.columns.status, type: "badge", badge: { tones: statusBadgeTones() } },
          { key: "started", title: catalog.runs.columns.started },
          { key: "finished", title: catalog.runs.columns.finished },
        ],
        rows: runs.map((run) => ({
          id: run.id,
          process: run.processName,
          version: formatVersion(run.versionNumber),
          status: statusLabel(run.status),
          started: formatWhen(run.startedAt),
          finished: formatWhen(run.finishedAt),
        })),
        actions: [{ id: "open", label: catalog.runs.open, onClick: (row: { id: string }) => navigate(runPath(row.id)) }],
      }),
    );
  };

  onQueryChange((route) => {
    if (route.name === "runs") void load(route.q, route.status);
  }, scope);
  await load(query, status);
}
