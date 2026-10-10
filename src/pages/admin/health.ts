import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatDayMonth } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { XWFlowIsoTiles } from "../../components/XWFlowIsoTiles/XWFlowIsoTiles";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Health, HealthCheck, HealthState, StatusTone } from "../../types/domain";
import { XWUIButton, XWUIDialog, XWUIUptimeBar } from "../../xwui";
import { glass, heading } from "../studio/common";
import { mountAdminBar } from "./common";
import "./admin.css";

const words = catalog.admin.health;
const tones: Record<HealthState, StatusTone> = { ok: "ok", warn: "warn", err: "err" };
const uptimeStatus: Record<HealthState, string> = { ok: "up", warn: "degraded", err: "down" };
const DAY = 24 * 60 * 60 * 1000;
const clock = new Intl.DateTimeFormat(config.locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
/** XWUIUptimeBar draws up to 14 days, so the page passes the most recent 14. */
const UPTIME_DAYS = 14;
const hubPlaces: Record<string, [number, number]> = { api: [60, 127], workers: [220, 37], scheduler: [220, 217], storage: [380, 127] };

export async function render(context: PageContext): Promise<void> {
  const { scope, body } = context;
  const bar = await mountAdminBar(context, "system", words.crumb);
  let health = await api.getHealth();

  const again = scope.track(new XWUIButton(slot(bar.actions), { text: words.checkAgain }, { variant: "ghost", size: "sm", icon: "rotate-ccw", className: "xwflow-btn-gradient" }));
  const content = el("div", "xwflow-stack xwflow-gap-22");
  body.append(content);
  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });

  const draw = (): void => {
    owned.splice(0).forEach((item) => item.destroy());
    content.replaceChildren();
    const tracker: Tracker = { track: (item) => (owned.push(item), item) };
    renderSummary(content, tracker, health);
    const panels = el("div", "xwflow-admin-panels");
    content.append(panels);
    renderTopology(panels, tracker, health);
    renderUptime(panels, tracker, health);
    renderChecks(content, tracker, health);
  };

  again.onClick(async () => {
    again.setLoading(true);
    try {
      health = await api.recheckHealth();
      draw();
      notify(fill(words.checked, { n: health.checks.filter((check) => check.state !== "ok").length }), "info");
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      again.setLoading(false);
    }
  });

  draw();

  const actions = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  body.append(actions);
  const pause = scope.track(new XWUIButton(slot(actions), { text: words.pause }, { variant: "ghost", className: "xwflow-btn-glass" }));
  const drain = scope.track(new XWUIButton(slot(actions), { text: words.drain }, { variant: "ghost", className: "xwflow-btn-glass" }));
  actions.append(el("span", "xwflow-xs xwflow-ter", words.confirmNote));
  pause.onClick(() =>
    confirm(scope, words.pauseTitle, words.pauseBody, words.confirmPause, async () => {
      const result = await api.pauseSchedules();
      notify(fill(words.paused, { n: result.paused }), "success");
    }),
  );
  drain.onClick(() =>
    confirm(scope, words.drainTitle, words.drainBody, words.confirmDrain, async () => {
      const result = await api.drainWorker();
      notify(fill(words.drained, { worker: result.worker, n: result.remaining }), "success");
      health = await api.getHealth();
      draw();
    }),
  );
}

function renderSummary(parent: HTMLElement, scope: Tracker, health: Health): void {
  const attention = health.checks.filter((check) => check.state !== "ok");
  const panel = glass(parent, { className: "xwflow-health-hero xwflow-clip" });
  const orbBox = el("div", "xwflow-health-hero__orb");
  panel.append(orbBox);
  scope.track(new XWFlowShape(slot(orbBox), { kind: "halo" }, { size: 200, color: attention.length ? "pink" : "lime", place: { left: "-40px", top: "-40px" } }));
  scope.track(new XWFlowShape(slot(orbBox), { kind: "orb" }, { size: 90, color: attention.length ? "pink" : "lime", place: { left: "0", top: "0" } }));
  const text = el("div", "xwflow-stack xwflow-gap-8 xwflow-grow xwflow-relative");
  panel.append(text);
  heading(text, 1, "h2", attention.length ? fill(words.headline, { n: attention.length, total: health.checks.length }) : fill(words.headlineOk, { total: health.checks.length }));
  const storage = health.services.find((service) => service.id === "storage" && service.state === "err");
  const minutes = storage?.downSince ? Math.max(1, Math.round((Date.now() - storage.downSince) / 60_000)) : 0;
  text.append(el("p", "xwflow-sec", storage ? fill(words.storageDown, { minutes }) : words.healthyBody));
}

function renderTopology(parent: HTMLElement, scope: Tracker, health: Health): void {
  const panel = glass(parent, { pad: "m", className: "xwflow-stack xwflow-gap-8", label: words.topology });
  const head = el("div", "xwflow-row");
  panel.append(head);
  heading(head, 2, "h3", words.topology);
  head.append(el("span", "xwflow-xs xwflow-ter xwflow-push", words.live));
  const hubs = ["api", "workers", "scheduler", "storage"]
    .map((id) => health.services.find((service) => service.id === id))
    .filter((service): service is Health["services"][number] => Boolean(service));
  const down = hubs.filter((hub) => hub.state !== "ok").map((hub) => `${hub.label}: ${words.legend[hub.state]}`).join(", ");
  scope.track(
    new XWFlowIsoTiles(
      slot(panel),
      {
        tiles: hubs.map((hub) => ({
          id: hub.id,
          label: hub.label,
          state: hub.state === "ok" ? (hub.id === "api" ? "info" : "ok") : hub.state,
          x: hubPlaces[hub.id][0],
          y: hubPlaces[hub.id][1],
          lift: 40,
        })),
        label: fill(words.topologyLabel, { down: down || words.legend.ok }),
      },
      { variant: "hub", width: 520, height: 340, tilt: { x: 60, z: -30 }, floor: true, links: true },
    ),
  );
}

function renderUptime(parent: HTMLElement, scope: Tracker, health: Health): void {
  const shown = Math.min(UPTIME_DAYS, health.uptime[0]?.days.length ?? UPTIME_DAYS);
  const panel = glass(parent, { pad: "m", className: "xwflow-stack xwflow-gap-12", label: fill(words.lastDays, { n: shown }) });
  heading(panel, 2, "h3", fill(words.lastDays, { n: shown }));
  const now = Date.now();
  for (const full of health.uptime) {
    const row = { ...full, days: full.days.slice(-shown) };
    const line = el("div", "xwflow-row xwflow-gap-12 xwflow-uptime");
    line.append(el("span", "xwflow-small xwflow-strong xwflow-uptime__name", row.service));
    const host = slot(line, "xwflow-grow");
    const count = (state: HealthState) => row.days.filter((day) => day === state).length;
    host.setAttribute("aria-label", fill(words.uptimeLabel, { service: row.service, ok: count("ok"), warn: count("warn"), err: count("err") }));
    scope.track(
      new XWUIUptimeBar(host, {
        service: row.service,
        days: row.days.map((state, index) => ({
          id: `${row.service}-${index}`,
          status: uptimeStatus[state],
          label: formatDayMonth(now - (row.days.length - 1 - index) * DAY),
        })),
      }, { className: "xwflow-uptime__bar" }),
    );
    panel.append(line);
  }
  const legend = el("div", "xwflow-row xwflow-gap-16");
  panel.append(legend);
  for (const state of ["ok", "warn", "err"] as const) scope.track(new XWFlowStatus(slot(legend), { tone: tones[state], label: words.legend[state] }));
  const log = el("pre", "xwflow-terminal__code xwflow-health-log");
  log.setAttribute("aria-label", words.logLabel);
  for (const entry of health.log) {
    const row = el("span", "xwflow-terminal__line");
    row.append(clock.format(entry.at), " ", el("span", `xwflow-health-log__source xwflow-health-log__source--${entry.tone}`, entry.source), " ", entry.message);
    log.append(row);
  }
  panel.append(log);
}

function detailText(check: HealthCheck): string {
  const detail: Record<string, string | number> = { ...check.detail };
  if (typeof detail.lastGood === "number") detail.lastGood = clock.format(detail.lastGood).slice(0, 5);
  const key = check.id === "storage" && check.summary === "answering" ? "answeringStorage" : check.summary;
  if (check.summary === "heartbeating") detail.total = detail.total ?? detail.alive;
  return fill(words.details[key], detail as Record<string, string | number>);
}

function renderChecks(parent: HTMLElement, scope: Tracker, health: Health): void {
  const grid = el("div", "xwflow-grid");
  grid.style.setProperty("--xwflow-min", "250px");
  parent.append(grid);
  for (const check of health.checks) {
    const card = el("div", "xwflow-check");
    card.dataset.state = check.state;
    const head = el("div", "xwflow-row");
    head.append(el("b", undefined, check.label), el("span", "xwflow-xs xwflow-ter xwflow-push", fill(words.ago, { n: Math.max(1, Math.round((Date.now() - check.checkedAt) / 1000)) })));
    card.append(head);
    scope.track(new XWFlowStatus(slot(card), { tone: tones[check.state], label: words.summaries[check.summary] }));
    card.append(el("p", "xwflow-small xwflow-sec", detailText(check)));
    grid.append(card);
  }
}

function confirm(scope: Tracker, title: string, body: string, action: string, run: () => Promise<void>): void {
  const content = el("p", "xwflow-sec", body);
  const footer = el("div", "xwflow-row xwflow-gap-8 xwflow-dialog-footer");
  const owned: Array<{ destroy(): void }> = [];
  const dialog = new XWUIDialog(slot(document.body), { title, content, footer }, { size: "small", closable: true });
  const cancel = new XWUIButton(slot(footer), { text: words.cancel }, { variant: "ghost", className: "xwflow-btn-glass" });
  const ok = new XWUIButton(slot(footer), { text: action }, { variant: "danger" });
  owned.push(cancel, ok, dialog);
  const close = (): void => {
    dialog.close();
    setTimeout(() => owned.splice(0).forEach((item) => item.destroy()), 300);
  };
  cancel.onClick(close);
  ok.onClick(async () => {
    ok.setLoading(true);
    try {
      await run();
      close();
    } catch (error) {
      notify(errorMessage(error), "danger");
      ok.setLoading(false);
    }
  });
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  setTimeout(() => dialog.open(), 0);
}
