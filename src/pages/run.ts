import { getRun } from "../api/client";
import { appConfig } from "../config";
import { catalog, statusLabel } from "../content/catalog";
import { formatVersion, formatWhen } from "../app/format";
import { MountScope } from "../app/mount";
import { href, navigate, processPath } from "../app/router";
import type { RunDetail, RunStatus } from "../types/domain";
import {
  XWUIBreadcrumbs,
  XWUIButton,
  XWUIDisplayStatusPill,
  XWUIPageHeader,
  XWUISteps,
  XWUITimeline,
} from "../xwui";

const pillStatus: Record<RunStatus, string> = {
  queued: "away",
  running: "busy",
  succeeded: "online",
  failed: "offline",
};

export async function renderRun(slot: HTMLElement, scope: MountScope, runId: string): Promise<void> {
  slot.replaceChildren();
  const crumbs = scope.host();
  const header = scope.host();
  const statusHost = scope.host();
  const linkHost = scope.host();
  const stepsHost = scope.host();
  const recordHost = scope.host();
  slot.append(crumbs, header, statusHost, linkHost, stepsHost, recordHost);

  const live = { current: new MountScope() };
  scope.track({ destroy: () => live.current.destroy() });

  let chromeReady = false;
  const paint = (run: RunDetail) => {
    if (!chromeReady) {
      scope.track(
        new XWUIBreadcrumbs(crumbs, {
          items: [
            { label: catalog.run.back, href: href(catalog.paths.runs) },
            { label: run.id },
          ],
        }),
      );
      scope.track(
        new XWUIPageHeader(header, {
          title: run.processName,
          subtitle: `${catalog.run.versionLabel} ${formatVersion(run.versionNumber)}`,
        }),
      );
      const open = scope.track(new XWUIButton(linkHost, { text: catalog.run.openProcess }));
      open.onClick(() => navigate(processPath(run.processId)));
      chromeReady = true;
    }

    live.current.destroy();
    live.current = new MountScope();
    const local = live.current;
    statusHost.replaceChildren();
    stepsHost.replaceChildren();
    recordHost.replaceChildren();

    local.track(
      new XWUIDisplayStatusPill(statusHost, {
        label: statusLabel(run.status),
        status: pillStatus[run.status],
      }),
    );

    const current = run.steps.findIndex((step) => step.status === "running" || step.status === "failed");
    local.track(
      new XWUISteps(stepsHost, {
        steps: run.steps.map((step) => ({
          title: step.name,
          description: statusLabel(step.status),
        })),
        current: current === -1 ? run.steps.length - 1 : current,
      }),
    );
    local.track(
      new XWUITimeline(recordHost, {
        mode: "left",
        items: [
          {
            id: "start",
            date: formatWhen(run.startedAt),
            title: catalog.runs.columns.started,
            description: run.startedBy,
          },
          ...run.steps.map((step) => ({
            id: step.id,
            date: formatWhen(step.startedAt),
            title: step.name,
            description: step.note || statusLabel(step.status),
          })),
          {
            id: "finish",
            date: formatWhen(run.finishedAt),
            title: catalog.runs.columns.finished,
            description: statusLabel(run.status),
          },
        ],
      }),
    );
  };

  const run = await getRun(runId);
  paint(run);
  if (run.status === "queued" || run.status === "running") {
    const timer = window.setInterval(() => {
      void getRun(runId).then((next) => {
        paint(next);
        if (next.status !== "queued" && next.status !== "running") window.clearInterval(timer);
      });
    }, appConfig.pollIntervalMs);
    scope.track({ destroy: () => window.clearInterval(timer) });
  }
}
