import { listProcesses, listRuns, startRun } from "../api/client";
import { boardState, patchBoard, watchBoard } from "../app/board";
import { formatAgo, formatUpdated, formatVersion } from "../app/format";
import { icon } from "../app/icons";
import { MountScope } from "../app/mount";
import { errorMessage, notify } from "../app/notify";
import { navigate, processPath, runPath } from "../app/router";
import { catalog, statusLabel } from "../content/catalog";
import { openCreateProcess } from "./processes";
import type { ProcessSummary, RunStatus, RunSummary } from "../types/domain";

type FlowStatus = "published" | "unpublished" | "draft";
type Tone = "ok" | "fail" | "run" | "muted";
type OwnerTone = "you" | "sam";

interface FlowRow {
  id: string;
  name: string;
  folder: string;
  steps: readonly string[];
  status: FlowStatus;
  lastRun: string;
  lastTone: Tone;
  nextRun: string;
  owner: string;
  ownerTone: OwnerTone;
  updated: string;
  processId: string;
  canRun: boolean;
}

const stepPalette = ["#d6f25a", "#3ee0c5", "#6aa7ff", "#c084fc", "#f472b6", "#fbbf24"];
const flowStatuses = new Set<FlowStatus>(["published", "unpublished", "draft"]);
const tones = new Set<Tone>(["ok", "fail", "run", "muted"]);

export async function renderOverview(slot: HTMLElement, scope: MountScope): Promise<void> {
  const [processes, runs] = await Promise.all([listProcesses(), listRuns()]);
  const live = liveRows(processes, runs);
  const samples = sampleRows();

  slot.replaceChildren();
  const board = document.createElement("div");
  board.className = "xwflow-board";
  slot.append(board);

  const hero = document.createElement("section");
  hero.className = "xwflow-hero";
  const identity = document.createElement("div");
  identity.className = "xwflow-hero__id";
  const orb = document.createElement("div");
  orb.className = "xwflow-orb";
  orb.setAttribute("aria-hidden", "true");
  const copy = document.createElement("div");
  const title = document.createElement("h1");
  title.className = "xwflow-hero__title";
  title.append(document.createTextNode(catalog.studio.project));
  const privacy = document.createElement("span");
  privacy.className = "xwflow-pill";
  privacy.textContent = catalog.studio.privacy;
  title.append(privacy);
  const lede = document.createElement("p");
  lede.className = "xwflow-hero__lede";
  lede.textContent = catalog.studio.heroBody;
  copy.append(title, lede);
  identity.append(orb, copy);

  const actions = document.createElement("div");
  actions.className = "xwflow-hero__actions";
  const demo = document.createElement("button");
  demo.type = "button";
  demo.className = "xwflow-demo";
  demo.append(icon("spark"), document.createTextNode(catalog.studio.demo));
  const split = document.createElement("div");
  split.className = "xwflow-split-btn";
  const create = document.createElement("button");
  create.type = "button";
  create.className = "xwflow-lime";
  create.append(icon("plus"), document.createTextNode(catalog.studio.createFlow));
  const more = document.createElement("button");
  more.type = "button";
  more.className = "xwflow-lime xwflow-lime--more";
  more.setAttribute("aria-label", catalog.studio.moreCreate);
  more.append(icon("chevron"));
  split.append(create, more);
  actions.append(demo, split);
  hero.append(identity, actions);

  const metrics = document.createElement("section");
  metrics.className = "xwflow-metrics";
  const metricValues = {
    published: metric(metrics, "published", catalog.studio.stats.published),
    running: metric(metrics, "running", catalog.studio.stats.running),
    failed: metric(metrics, "failed", catalog.studio.stats.failed),
    drafts: metric(metrics, "drafts", catalog.studio.stats.drafts),
  };

  const tabs = document.createElement("div");
  tabs.className = "xwflow-tabs";
  tabs.setAttribute("role", "tablist");
  const tabButtons = new Map<string, HTMLButtonElement>();
  for (const item of catalog.studio.tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "xwflow-tabs__tab";
    button.textContent = item.label;
    button.dataset.tab = item.id;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => patchBoard({ tab: item.id, status: "" }));
    tabs.append(button);
    tabButtons.set(item.id, button);
  }

  const filters = document.createElement("div");
  filters.className = "xwflow-filters";
  const searchField = field();
  searchField.append(icon("search"));
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = catalog.studio.searchFlows;
  search.setAttribute("aria-label", catalog.studio.searchFlows);
  search.addEventListener("input", () => patchBoard({ query: search.value, chatId: "" }));
  searchField.append(search);
  const statusField = field();
  const statusSelect = document.createElement("select");
  statusSelect.setAttribute("aria-label", catalog.studio.anyStatus);
  statusSelect.addEventListener("change", () => patchBoard({ status: statusSelect.value }));
  statusField.append(statusSelect, icon("chevron"));
  const folderField = field();
  const folderSelect = document.createElement("select");
  folderSelect.setAttribute("aria-label", catalog.studio.allFolders);
  folderSelect.addEventListener("change", () => patchBoard({ folder: folderSelect.value }));
  folderField.append(folderSelect, icon("chevron"));
  filters.append(searchField, statusField, folderField);

  const table = document.createElement("div");
  table.className = "xwflow-table";
  const grid = document.createElement("div");
  grid.className = "xwflow-grid";
  grid.setAttribute("role", "table");
  const head = document.createElement("div");
  head.className = "xwflow-grid__head";
  head.setAttribute("role", "row");
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.className = "xwflow-check";
  selectAll.setAttribute("aria-label", catalog.studio.selectAll);
  const body = document.createElement("div");
  body.className = "xwflow-grid__body";
  grid.append(head, body);
  table.append(grid);

  const preview = document.createElement("section");
  preview.className = "xwflow-preview";
  const previewTitle = document.createElement("h1");
  const previewBody = document.createElement("p");
  previewBody.textContent = catalog.studio.tabPreview;
  preview.append(previewTitle, previewBody);

  board.append(hero, metrics, tabs, filters, table, preview);

  const selected = new Set<string>();
  let optionMode = "";
  let folderKey = "";
  let demoBusy = false;

  const closeMenu = () => {
    board.querySelector(".xwflow-menu")?.remove();
  };
  const onDocumentClick = () => closeMenu();
  document.addEventListener("click", onDocumentClick);
  scope.track({
    destroy() {
      document.removeEventListener("click", onDocumentClick);
      closeMenu();
    },
  });

  const openMenu = (anchor: HTMLElement, items: { label: string; onSelect: () => void }[]) => {
    closeMenu();
    const list = document.createElement("div");
    list.className = "xwflow-menu";
    list.setAttribute("role", "menu");
    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "xwflow-menu__item";
      button.setAttribute("role", "menuitem");
      button.textContent = item.label;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        closeMenu();
        item.onSelect();
      });
      list.append(button);
    }
    anchor.append(list);
  };

  create.addEventListener("click", (event) => {
    event.stopPropagation();
    closeMenu();
    openCreateProcess(scope, () => undefined);
  });
  more.addEventListener("click", (event) => {
    event.stopPropagation();
    openMenu(
      split,
      catalog.studio.createMenu.map((item) => ({
        label: item.label,
        onSelect: () => {
          if (item.id === "flow") openCreateProcess(scope, () => undefined);
          else notify(catalog.studio.previewNotice, "info");
        },
      })),
    );
  });
  demo.addEventListener("click", () => {
    if (demoBusy) return;
    const published = processes.find((item) => item.state === "published");
    if (!published) {
      notify(catalog.studio.demoNeedsPublish, "warning");
      return;
    }
    demoBusy = true;
    demo.disabled = true;
    void startRun(published.id)
      .then((run) => {
        notify(catalog.studio.demoStarted, "success");
        navigate(runPath(run.id));
      })
      .catch((error: unknown) => {
        demoBusy = false;
        demo.disabled = false;
        notify(errorMessage(error), "danger");
      });
  });

  const paint = () => {
    const view = boardState();
    const rows = view.sampleRows ? samples : live;
    const totals = view.sampleRows ? sampleTotals(rows) : liveTotals(processes, runs);
    metricValues.published.textContent = String(totals.published);
    metricValues.running.textContent = String(totals.running);
    metricValues.failed.textContent = String(totals.failed);
    metricValues.drafts.textContent = String(totals.drafts);

    const tab = catalog.studio.tabs.some((item) => item.id === view.tab) ? view.tab : "flows";
    for (const [id, button] of tabButtons) {
      const on = id === tab;
      button.setAttribute("aria-selected", String(on));
      button.tabIndex = on ? 0 : -1;
    }
    const dataTab = tab === "flows" || tab === "runs";
    filters.hidden = !dataTab;
    table.hidden = !dataTab;
    preview.hidden = dataTab;
    const activeTab = catalog.studio.tabs.find((item) => item.id === tab);
    previewTitle.textContent = activeTab ? activeTab.label : catalog.studio.preview;

    if (document.activeElement !== search) search.value = view.query;
    search.placeholder = tab === "runs" ? catalog.studio.searchRuns : catalog.studio.searchFlows;
    folderField.hidden = tab !== "flows";

    const mode = tab === "runs" ? "runs" : "flows";
    if (mode !== optionMode) {
      optionMode = mode;
      fillSelect(statusSelect, mode === "runs" ? catalog.studio.runStatuses : catalog.studio.flowStatuses);
    }
    if (statusSelect.value !== view.status) statusSelect.value = view.status;

    const folderKeyNext = rows.map((row) => row.folder).join("|");
    if (folderKeyNext !== folderKey) {
      folderKey = folderKeyNext;
      fillSelect(folderSelect, [
        { value: "", label: catalog.studio.allFolders },
        ...foldersOf(rows).map((folder) => ({ value: folder, label: folder })),
      ]);
    }
    if (view.folder && !rows.some((row) => row.folder === view.folder)) {
      patchBoard({ folder: "" });
      return;
    }
    if (folderSelect.value !== view.folder) folderSelect.value = view.folder;

    grid.classList.toggle("is-runs", tab === "runs");
    head.replaceChildren();
    body.replaceChildren();
    if (tab === "runs") paintRuns(head, body, runs, view, selected, openMenu);
    else if (tab === "flows") paintFlows(head, body, rows, view, selected, selectAll, openMenu);
  };

  selectAll.addEventListener("change", () => {
    const view = boardState();
    const visible = filterFlows(view.sampleRows ? samples : live, view);
    selected.clear();
    if (selectAll.checked) {
      for (const row of visible) selected.add(row.id);
    }
    paint();
  });

  watchBoard(paint, scope);
  paint();
}

function metric(host: HTMLElement, tone: string, label: string): HTMLElement {
  const card = document.createElement("article");
  card.className = `xwflow-metric is-${tone}`;
  const name = document.createElement("p");
  name.className = "xwflow-metric__label";
  name.textContent = label;
  const value = document.createElement("p");
  value.className = "xwflow-metric__value";
  card.append(name, value);
  host.append(card);
  return value;
}

function field(): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "xwflow-field";
  return node;
}

function fillSelect(select: HTMLSelectElement, options: readonly { value: string; label: string }[]): void {
  const current = select.value;
  select.replaceChildren();
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    select.append(node);
  }
  if (options.some((option) => option.value === current)) select.value = current;
}

function sampleRows(): FlowRow[] {
  return catalog.studio.sampleFlows.map((item) => ({
    id: item.id,
    name: item.name,
    folder: item.folder,
    steps: item.steps,
    status: flowStatuses.has(item.status as FlowStatus) ? (item.status as FlowStatus) : "draft",
    lastRun: item.lastRun,
    lastTone: tones.has(item.lastTone as Tone) ? (item.lastTone as Tone) : "muted",
    nextRun: item.nextRun,
    owner: item.owner,
    ownerTone: item.ownerTone === "sam" ? "sam" : "you",
    updated: item.updated,
    processId: "",
    canRun: false,
  }));
}

function liveRows(processes: ProcessSummary[], runs: RunSummary[]): FlowRow[] {
  const grouped = new Map<string, RunSummary[]>();
  for (const run of runs) {
    const list = grouped.get(run.processId) ?? [];
    list.push(run);
    grouped.set(run.processId, list);
  }
  return processes.map((process) => {
    const related = (grouped.get(process.id) ?? []).slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const latest = related[0];
    const active = related.find((run) => run.status === "running" || run.status === "queued");
    let lastRun: string = catalog.studio.notRecorded;
    let lastTone: Tone = "muted";
    if (active) {
      lastRun = catalog.studio.running;
      lastTone = "run";
    } else if (latest?.status === "failed") {
      lastRun = `${catalog.studio.failedPrefix}${formatAgo(latest.startedAt)}`;
      lastTone = "fail";
    } else if (latest) {
      lastRun = formatAgo(latest.startedAt);
      lastTone = "ok";
    }
    const status: FlowStatus = process.state === "draft" ? "draft" : "published";
    return {
      id: process.id,
      name: process.name,
      folder: process.owner,
      steps: stepPalette.slice(0, Math.min(process.stepCount, stepPalette.length)),
      status,
      lastRun,
      lastTone,
      nextRun: status === "draft" ? catalog.studio.draftNext : catalog.studio.noSchedule,
      owner: catalog.studio.you,
      ownerTone: "you",
      updated: formatUpdated(process.updatedAt),
      processId: process.id,
      canRun: process.state === "published",
    };
  });
}

function sampleTotals(rows: FlowRow[]): { published: number; running: number; failed: number; drafts: number } {
  return {
    published: rows.filter((row) => row.status === "published").length,
    running: rows.filter((row) => row.lastTone === "run").length,
    failed: rows.filter((row) => row.lastTone === "fail").length,
    drafts: rows.filter((row) => row.status === "draft").length,
  };
}

function liveTotals(
  processes: ProcessSummary[],
  runs: RunSummary[],
): { published: number; running: number; failed: number; drafts: number } {
  return {
    published: processes.filter((item) => item.state === "published").length,
    running: runs.filter((item) => item.status === "running" || item.status === "queued").length,
    failed: runs.filter((item) => item.status === "failed").length,
    drafts: processes.filter((item) => item.state === "draft").length,
  };
}

function foldersOf(rows: FlowRow[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const row of rows) {
    if (seen.has(row.folder)) continue;
    seen.add(row.folder);
    list.push(row.folder);
  }
  return list;
}

function filterFlows(rows: FlowRow[], view: { query: string; status: string; folder: string }): FlowRow[] {
  const query = view.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (query && !`${row.name} ${row.folder}`.toLowerCase().includes(query)) return false;
    if (view.folder && row.folder !== view.folder) return false;
    if (!view.status) return true;
    if (view.status === "running") return row.lastTone === "run";
    if (view.status === "failed") return row.lastTone === "fail";
    return row.status === view.status;
  });
}

function paintFlows(
  head: HTMLElement,
  body: HTMLElement,
  rows: FlowRow[],
  view: { query: string; status: string; folder: string; sampleRows: boolean },
  selected: Set<string>,
  selectAll: HTMLInputElement,
  openMenu: (anchor: HTMLElement, items: { label: string; onSelect: () => void }[]) => void,
): void {
  const visible = filterFlows(rows, view);
  selectAll.checked = visible.length > 0 && visible.every((row) => selected.has(row.id));
  selectAll.indeterminate = !selectAll.checked && visible.some((row) => selected.has(row.id));
  head.append(
    cell(selectAll),
    heading(catalog.studio.columns.name),
    heading(catalog.studio.columns.steps),
    heading(catalog.studio.columns.status),
    heading(catalog.studio.columns.lastRun),
    heading(catalog.studio.columns.nextRun),
    heading(catalog.studio.columns.owner),
    heading(catalog.studio.columns.updated),
    heading(""),
  );
  if (!visible.length) {
    body.append(emptyRow(catalog.studio.emptyFlows));
    return;
  }
  for (const row of visible) {
    const line = document.createElement("div");
    line.className = "xwflow-grid__row";
    line.setAttribute("role", "row");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "xwflow-check";
    check.checked = selected.has(row.id);
    check.setAttribute("aria-label", row.name);
    check.addEventListener("change", () => {
      if (check.checked) selected.add(row.id);
      else selected.delete(row.id);
      selectAll.checked = visible.length > 0 && visible.every((item) => selected.has(item.id));
      selectAll.indeterminate = !selectAll.checked && visible.some((item) => selected.has(item.id));
    });
    const actions = document.createElement("div");
    actions.className = "xwflow-menu-anchor";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "xwflow-actions";
    button.textContent = catalog.studio.actions;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const items: { label: string; onSelect: () => void }[] = [
        {
          label: catalog.studio.open,
          onSelect: () => {
            if (!row.processId) {
              notify(catalog.studio.sampleNotice, "info");
              return;
            }
            navigate(processPath(row.processId));
          },
        },
      ];
      if (row.canRun && row.processId) {
        items.push({
          label: catalog.studio.startRun,
          onSelect: () => {
            void startRun(row.processId)
              .then((run) => {
                notify(catalog.process.started, "success");
                navigate(runPath(run.id));
              })
              .catch((error: unknown) => notify(errorMessage(error), "danger"));
          },
        });
      }
      openMenu(actions, items);
    });
    actions.append(button);
    line.append(
      cell(check),
      nameCell(row.name, row.folder),
      stepsCell(row.steps),
      statusCell(row.status),
      toneCell(row.lastRun, row.lastTone),
      stackCell(row.nextRun),
      ownerCell(row.owner, row.ownerTone),
      stackCell(row.updated),
      cell(actions),
    );
    line.addEventListener("dblclick", () => {
      if (row.processId) navigate(processPath(row.processId));
    });
    body.append(line);
  }
}

function paintRuns(
  head: HTMLElement,
  body: HTMLElement,
  runs: RunSummary[],
  view: { query: string; status: string },
  selected: Set<string>,
  openMenu: (anchor: HTMLElement, items: { label: string; onSelect: () => void }[]) => void,
): void {
  const query = view.query.trim().toLowerCase();
  const visible = runs.filter((run) => {
    if (query && !`${run.processName} ${run.id}`.toLowerCase().includes(query)) return false;
    if (view.status && run.status !== view.status) return false;
    return true;
  });
  head.append(
    heading(""),
    heading(catalog.studio.columns.name),
    heading(catalog.studio.columns.status),
    heading(catalog.studio.columns.started),
    heading(catalog.studio.columns.version),
    heading(""),
  );
  if (!visible.length) {
    body.append(emptyRow(catalog.studio.emptyRuns));
    return;
  }
  for (const run of visible) {
    const line = document.createElement("div");
    line.className = "xwflow-grid__row";
    line.setAttribute("role", "row");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "xwflow-check";
    check.checked = selected.has(run.id);
    check.setAttribute("aria-label", run.processName);
    check.addEventListener("change", () => {
      if (check.checked) selected.add(run.id);
      else selected.delete(run.id);
    });
    const actions = document.createElement("div");
    actions.className = "xwflow-menu-anchor";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "xwflow-actions";
    button.textContent = catalog.studio.actions;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openMenu(actions, [
        { label: catalog.studio.open, onSelect: () => navigate(runPath(run.id)) },
      ]);
    });
    actions.append(button);
    line.append(
      cell(check),
      nameCell(run.processName, run.id),
      toneCell(statusLabel(run.status), runTone(run.status)),
      stackCell(formatAgo(run.startedAt)),
      stackCell(formatVersion(run.versionNumber)),
      cell(actions),
    );
    line.addEventListener("dblclick", () => navigate(runPath(run.id)));
    body.append(line);
  }
}

function runTone(status: RunStatus): Tone {
  if (status === "succeeded") return "ok";
  if (status === "failed") return "fail";
  if (status === "running" || status === "queued") return "run";
  return "muted";
}

function cell(node: Node): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell";
  wrap.setAttribute("role", "cell");
  wrap.append(node);
  return wrap;
}

function heading(text: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__heading";
  wrap.setAttribute("role", "columnheader");
  wrap.textContent = text;
  return wrap;
}

function nameCell(name: string, folder: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell xwflow-name";
  wrap.setAttribute("role", "cell");
  const title = document.createElement("span");
  title.className = "xwflow-name__title";
  title.textContent = name;
  const sub = document.createElement("span");
  sub.className = "xwflow-name__folder";
  sub.textContent = folder;
  wrap.append(title, sub);
  return wrap;
}

function stepsCell(colors: readonly string[]): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell";
  wrap.setAttribute("role", "cell");
  const dots = document.createElement("span");
  dots.className = "xwflow-steps";
  for (const color of colors) {
    const dot = document.createElement("span");
    dot.className = "xwflow-steps__dot";
    dot.style.background = color;
    dot.style.boxShadow = `0 0 8px ${color}`;
    dots.append(dot);
  }
  wrap.append(dots);
  return wrap;
}

function statusCell(status: FlowStatus): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell";
  wrap.setAttribute("role", "cell");
  const label = document.createElement("span");
  label.className = `xwflow-status is-${status}`;
  const mark = document.createElement("span");
  mark.className = "xwflow-status__mark";
  mark.setAttribute("aria-hidden", "true");
  if (status === "unpublished") mark.append(icon("warning"));
  label.append(mark, document.createTextNode(catalog.studio.statusLabels[status]));
  wrap.append(label);
  return wrap;
}

function toneCell(text: string, tone: Tone): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell";
  wrap.setAttribute("role", "cell");
  const label = document.createElement("span");
  label.className = `xwflow-last is-${tone}`;
  const mark = document.createElement("span");
  mark.className = "xwflow-last__mark";
  mark.setAttribute("aria-hidden", "true");
  if (tone === "run") mark.append(icon("play"));
  if (tone === "fail") mark.append(icon("warning"));
  label.append(mark, document.createTextNode(text));
  wrap.append(label);
  return wrap;
}

function stackCell(text: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell xwflow-stack";
  wrap.setAttribute("role", "cell");
  wrap.textContent = text;
  return wrap;
}

function ownerCell(name: string, tone: OwnerTone): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__cell xwflow-owner";
  wrap.setAttribute("role", "cell");
  const avatar = document.createElement("span");
  avatar.className = `xwflow-avatar is-${tone}`;
  avatar.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = name;
  wrap.append(avatar, label);
  return wrap;
}

function emptyRow(text: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "xwflow-grid__empty";
  wrap.textContent = text;
  return wrap;
}
