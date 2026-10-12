/**
 * The health page's panels: the summary, the service topology, uptime and
 * each check, drawn from one Health snapshot.
 */
import { fill, formatDayMonth } from "../../app/format";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Health, HealthCheck, HealthState } from "../../types/domain";
import { decoration, glass, grid, row, space, stack, status, text, type Hue, type Node, type StatusTone } from "../../ui/kit";
import { columns } from "../../ui/layout";

const words = catalog.admin.health;
const tones: Record<HealthState, StatusTone> = {
  ok: "success",
  warn: "warning",
  err: "error",
};
const uptimeStatus: Record<HealthState, string> = {
  ok: "up",
  warn: "degraded",
  err: "down",
};
const DAY = 24 * 60 * 60 * 1000;
const clock = new Intl.DateTimeFormat(config.locale, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
/** XWUIUptimeBar draws up to 14 days, so the page passes the most recent 14. */
const UPTIME_DAYS = 14;
const hubPlaces: Record<string, [number, number]> = {
  api: [60, 127],
  workers: [220, 37],
  scheduler: [220, 217],
  storage: [380, 127],
};


function summary(health: Health): Node {
  const attention = health.checks.filter((check) => check.state !== "ok");
  const hue: Hue = attention.length ? "pink" : "lime";
  const storage = health.services.find(
    (service) => service.id === "storage" && service.state === "err",
  );
  const minutes = storage?.downSince
    ? Math.max(1, Math.round((Date.now() - storage.downSince) / 60_000))
    : 0;
  return {
    tag: "xwui-box",
    config: { surface: "glass", padding: space("xxl"), overflow: "clip" },
    slots: {
      children: row(
        [
          {
            tag: "xwui-box",
            config: { position: "relative", width: 90, height: 90 },
            slots: {
              children: stack(
                [
                  decoration("health.halo", hue),
                  decoration("health.orb", hue),
                ],
                { gap: "none" },
              ),
            },
          },
          stack(
            [
              text(
                "h2",
                attention.length
                  ? fill(words.headline, {
                      n: attention.length,
                      total: health.checks.length,
                    })
                  : fill(words.headlineOk, { total: health.checks.length }),
              ),
              text(
                "body",
                storage
                  ? fill(words.storageDown, { minutes })
                  : words.healthyBody,
                { tone: "secondary" },
              ),
            ],
            { gap: "s" },
          ),
        ],
        { gap: "xxl", wrap: true },
      ),
    },
  };
}

function topology(health: Health): Node {
  const hubs = ["api", "workers", "scheduler", "storage"]
    .map((id) => health.services.find((service) => service.id === id))
    .filter((service): service is Health["services"][number] =>
      Boolean(service),
    );
  const down = hubs
    .filter((hub) => hub.state !== "ok")
    .map((hub) => `${hub.label}: ${words.legend[hub.state]}`)
    .join(", ");
  return glass(
    stack(
      [
        row(
          [
            text("h3", words.topology, { level: 2 }),
            text("xs", words.live, { tone: "tertiary" }),
          ],
          { justify: "space-between" },
        ),
        {
          tag: "xwui-iso-tiles",
          data: {
            tiles: hubs.map((hub) => ({
              id: hub.id,
              label: hub.label,
              hue:
                hub.state === "ok"
                  ? hub.id === "api"
                    ? "cyan"
                    : "green"
                  : hub.state === "warn"
                    ? "amber"
                    : "red",
              alert: hub.state === "err",
              x: hubPlaces[hub.id][0],
              y: hubPlaces[hub.id][1],
              lift: 40,
            })),
            label: fill(words.topologyLabel, { down: down || words.legend.ok }),
          },
          config: {
            variant: "hub",
            width: 520,
            height: 340,
            tiltX: 60,
            tiltZ: -30,
            floor: true,
            links: true,
          },
        },
      ],
      { gap: "s" },
    ),
    { pad: "m" },
  );
}

function uptime(health: Health): Node {
  const shown = Math.min(
    UPTIME_DAYS,
    health.uptime[0]?.days.length ?? UPTIME_DAYS,
  );
  const now = Date.now();
  const log = health.log
    .map(
      (entry) =>
        `${clock.format(entry.at)}  ${entry.source.padEnd(10)} ${entry.message}`,
    )
    .join("\n");
  return glass(
    stack(
      [
        text("h3", fill(words.lastDays, { n: shown }), { level: 2 }),
        ...health.uptime.map((full) => {
          const days = full.days.slice(-shown);
          const count = (state: HealthState) =>
            days.filter((day) => day === state).length;
          // Name, then the strip filling the rest of the row.
          return {
            tag: "xwui-grid",
            config: {
              columns: columns.labelValue,
              gap: space("m"),
              alignItems: "center",
            },
            slots: {
              children: [
                text("small", full.service, { bold: true }),
                {
                  tag: "xwui-box",
                  config: {
                    width: "100%",
                    ariaLabel: fill(words.uptimeLabel, {
                      service: full.service,
                      ok: count("ok"),
                      warn: count("warn"),
                      err: count("err"),
                    }),
                  },
                  slots: {
                    children: {
                      tag: "xwui-uptime-bar",
                      config: { showService: false, details: false },
                      data: {
                        service: full.service,
                        days: days.map((state, index) => ({
                          id: `${full.service}-${index}`,
                          status: uptimeStatus[state],
                          label: formatDayMonth(
                            now - (days.length - 1 - index) * DAY,
                          ),
                        })),
                      },
                    },
                  },
                },
              ],
            },
          };
        }),
        row(
          (["ok", "warn", "err"] as const).map((state) =>
            status(tones[state], words.legend[state]),
          ),
          { gap: "l", wrap: true },
        ),
        {
          tag: "xwui-code-block",
          data: { code: log },
          config: {
            language: "text",
            showLineNumbers: false,
            copyable: false,
            ariaLabel: words.logLabel,
          },
        },
      ],
      { gap: "l" },
    ),
    { pad: "m" },
  );
}

function detailText(check: HealthCheck): string {
  const detail: Record<string, string | number> = { ...check.detail };
  if (typeof detail.lastGood === "number")
    detail.lastGood = clock.format(detail.lastGood).slice(0, 5);
  const key =
    check.id === "storage" && check.summary === "answering"
      ? "answeringStorage"
      : check.summary;
  if (check.summary === "heartbeating")
    detail.total = detail.total ?? detail.alive;
  return fill(words.details[key], detail);
}

function checks(health: Health): Node {
  return grid(
    health.checks.map((check) =>
      glass(
        stack(
          [
            row(
              [
                text("small", check.label, { bold: true }),
                text(
                  "xs",
                  fill(words.ago, {
                    n: Math.max(
                      1,
                      Math.round((Date.now() - check.checkedAt) / 1000),
                    ),
                  }),
                  { tone: "tertiary" },
                ),
              ],
              { justify: "space-between" },
            ),
            status(tones[check.state], words.summaries[check.summary]),
            text("small", detailText(check), { tone: "secondary" }),
          ],
          { gap: "m" },
        ),
        {
          pad: "s",
          glow: check.state === "err" ? "violet" : undefined,
          gradientBorder: check.state === "err",
        },
      ),
    ),
    "check",
    "l",
  );
}

/** Everything the page redraws after a check: summary, topology and uptime, then each check. */
export const content = (health: Health): Node =>
  stack(
    [
      summary(health),
      {
        tag: "xwui-grid",
        config: {
          columns: columns.one,
          gap: space("xl"),
          alignItems: "start",
          responsive: { lg: { columns: columns.halves } },
        },
        slots: { children: [topology(health), uptime(health)] },
      },
      checks(health),
    ],
    { gap: "xl" },
  );
