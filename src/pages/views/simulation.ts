import { downloadText } from "../../app/exporters";
import { fill, formatNumber } from "../../app/format";
import { notify } from "../../app/notify";
import { averageWaitMinutes, createSimulation, finished, step, workerUse, type SimulationState } from "../../app/simulation";
import { catalog } from "../../content/catalog";
import type { FlowView, SimulationModel, StepGroup } from "../../types/domain";
import { hueOf } from "../../ui/flow";
import { button, glass, grid, icon, iconTile, row, stack, tag, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer } from "../../xwui";
import type { ViewPart, ViewPartContext } from "./view";

const words = catalog.views.sim;
const TICK_MS = 100;
/** Redraw at most this often; the model can advance faster. */
const DRAW_MS = 250;

const stations: Array<{ key: keyof typeof words.stations; group: StepGroup; icon: string }> = [
  { key: "arrive", group: "trigger", icon: "zap" },
  { key: "queue", group: "control", icon: "list" },
  { key: "lookup", group: "integration", icon: "globe" },
  { key: "decide", group: "control", icon: "git-branch" },
  { key: "alert", group: "ai", icon: "message-square" },
  { key: "log", group: "data", icon: "database" },
];

function clock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
}

function counts(state: SimulationState): Record<keyof typeof words.stations, number> {
  return {
    arrive: state.served + state.queue,
    queue: state.queue,
    lookup: state.busy.length,
    decide: state.done,
    alert: state.alerts,
    log: state.done - state.alerts,
  };
}

/** The line of stations with their live counts, and the clock. */
function line(state: SimulationState, model: SimulationModel): Node {
  const now = counts(state);
  return stack(
    [
      row(
        [tag(words.badge, "amber", undefined, true), tag(words.sample, "plan"), text("small", fill(words.clock, { now: clock(state.minute), end: clock(model.hours * 60) }), { mono: true, tone: "secondary" })],
        { gap: 10, wrap: true },
      ),
      {
        tag: "xwui-box",
        config: { overflow: "auto", role: "img", ariaLabel: words.stageLabel },
        slots: {
          children: row(
            stations.flatMap((station, index) => [
              ...(index ? [icon("arrow-right", 18, "var(--text-tertiary)")] : []),
              glass(
                stack([iconTile(station.icon, hueOf[station.group], "sm"), text("xs", words.stations[station.key], { bold: true, tone: "secondary" }), text("disp", formatNumber(now[station.key]))], {
                  gap: 6,
                }),
                { pad: "s", glow: station.key === "queue" && state.queue > model.workers * 2 ? "violet" : undefined },
              ),
            ]),
            { gap: 10 },
          ),
        },
      },
    ],
    { gap: 16 },
  );
}

function results(state: SimulationState, model: SimulationModel): Node {
  const average = averageWaitMinutes(state);
  const kpi = (label: string, value: string, hue: string): Node => ({ tag: "xwui-kpi-card", data: { label, value }, config: { hue } });
  return stack(
    [
      grid(
        [
          kpi(words.kpis.done, formatNumber(state.done), "green"),
          kpi(words.kpis.wait, average === null ? "–" : fill(words.waitValue, { n: average.toFixed(1) }), "amber"),
          kpi(words.kpis.use, `${Math.round(workerUse(state, model) * 100)}%`, "cyan"),
          kpi(words.kpis.alerts, formatNumber(state.alerts), "pink"),
        ],
        160,
        12,
      ),
      glass(
        stack(
          [
            row([text("small", words.queue, { bold: true }), text("xs", words.queueWindow, { tone: "tertiary" })], { justify: "space-between" }),
            {
              tag: "xwui-spark-bars",
              data: { bars: state.queueHistory.map((value) => ({ value, alert: value > model.workers * 2 })), label: fill(words.queueLabel, { n: state.queue }) },
              config: { height: 80 },
            },
          ],
          { gap: 8 },
        ),
        { pad: "s" },
      ),
    ],
    { gap: 14 },
  );
}

export function simulationPart(view: FlowView, { instance, onLeave }: ViewPartContext): ViewPart {
  const model: SimulationModel = { ...view.simulation };
  let state = createSimulation(model);
  let speed = 10;
  let playing = true;
  let lastDraw = 0;

  const draw = (force = false): void => {
    const now = performance.now();
    if (!force && now - lastDraw < DRAW_MS) return;
    lastDraw = now;
    instance<XWUIComposer>("sim-line")?.setTree(line(state, model));
    instance<XWUIComposer>("sim-results")?.setTree(results(state, model));
  };
  const setPlaying = (next: boolean): void => {
    playing = next;
    // Redraws are throttled while playing; a pause shows exactly where the model stopped.
    if (!playing) draw(true);
    instance<XWUIButton>("sim-play")?.updateConfig({ icon: playing ? "pause" : "play", ariaLabel: playing ? words.pause : words.play, title: playing ? words.pause : words.play });
  };
  const advance = (minutes: number, force = false): void => {
    for (let index = 0; index < minutes && !finished(state, model); index += 1) state = step(state, model);
    draw(force);
    if (finished(state, model)) {
      draw(true);
      setPlaying(false);
    }
  };

  let carry = 0;
  const timer = setInterval(() => {
    if (!playing) return;
    carry += (speed * TICK_MS) / 1000;
    const whole = Math.floor(carry);
    carry -= whole;
    if (whole) advance(whole);
  }, TICK_MS);
  onLeave(() => clearInterval(timer));

  // Open on the first simulated hour, as the prototype does.
  for (let index = 0; index < 60 && !finished(state, model); index += 1) state = step(state, model);

  const controls = glass(
    stack(
      [
        text("small", words.controls, { bold: true }),
        row(
          [
            {
              ...button("primary", "", { size: "sm", icon: "pause", label: words.pause, onClick: () => setPlaying(!playing) }),
              key: "sim-play",
            },
            button("glass", "", {
              size: "sm",
              icon: "skip-forward",
              label: words.step,
              onClick: () => {
                setPlaying(false);
                advance(1, true);
              },
            }),
            button("glass", "", {
              size: "sm",
              icon: "rotate-ccw",
              label: words.restart,
              onClick: () => {
                state = createSimulation(model);
                draw(true);
                setPlaying(true);
              },
            }),
            {
              tag: "xwui-segmented-control",
              data: { value: String(speed) },
              config: { options: words.speeds.map((item) => ({ ...item })), ariaLabel: words.speedLabel },
              ref: (picked) => (picked as { onChange?(handler: (value: string) => void): void }).onChange?.((value) => (speed = Number(value))),
            },
          ],
          { gap: 8, wrap: true },
        ),
        { tag: "xwui-input-text", data: { label: words.arrival, value: fill(words.arrivalValue, { n: model.arrivalsPerHour }) }, config: { readonly: true, fullWidth: true } },
        { tag: "xwui-input-text", data: { label: words.service, value: fill(words.serviceValue, { n: model.serviceSeconds }) }, config: { readonly: true, fullWidth: true } },
        stack(
          [
            row([text("small", words.workers, { bold: true }), { tag: "xwui-composer", key: "sim-workers", data: { tree: tag(String(model.workers), "cyan") } }], { justify: "space-between" }),
            {
              tag: "xwui-slider",
              data: { value: model.workers },
              config: { min: 1, max: 12, step: 1, ariaLabel: words.workers },
              ref: (slider) =>
                (slider as { onChange(handler: (value: number) => void): void }).onChange((value) => {
                  model.workers = Math.round(Number(value));
                  instance<XWUIComposer>("sim-workers")?.setTree(tag(String(model.workers), "cyan"));
                }),
            },
          ],
          { gap: 8 },
        ),
      ],
      { gap: 14 },
    ),
    { pad: "m" },
  );

  return {
    stage: { tag: "xwui-composer", key: "sim-line", data: { tree: line(state, model) } },
    footer: [
      {
        tag: "xwui-grid",
        config: { columns: "minmax(0, 1fr)", gap: "16px", alignItems: "start", responsive: { lg: { columns: "minmax(0, 1fr) minmax(0, 2fr)" } } },
        slots: {
          children: [
            controls,
            // The redraw area stretches to its column so the KPIs and the chart use the full width.
            { tag: "xwui-box", config: { width: "100%" }, slots: { children: { tag: "xwui-composer", key: "sim-results", data: { tree: results(state, model) } } } },
          ],
        },
      },
    ],
    export: () => {
      const report = { model, minute: state.minute, done: state.done, alerts: state.alerts, queue: state.queue, workerUse: workerUse(state, model), averageWaitMinutes: averageWaitMinutes(state) };
      downloadText("simulation.json", JSON.stringify(report, null, 2), "application/json");
      notify(fill(catalog.views.exported, { name: "simulation.json" }), "success");
    },
  };
}
