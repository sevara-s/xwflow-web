import { el, slot } from "../../app/dom";
import { downloadText } from "../../app/exporters";
import { fill, formatNumber } from "../../app/format";
import { notify } from "../../app/notify";
import { averageWaitMinutes, createSimulation, finished, step, workerUse, type SimulationState } from "../../app/simulation";
import { XWFlowKpi } from "../../components/XWFlowKpi/XWFlowKpi";
import { XWFlowSparkBars } from "../../components/XWFlowSparkBars/XWFlowSparkBars";
import { catalog } from "../../content/catalog";
import type { SimulationModel } from "../../types/domain";
import { XWUIButton, XWUIInputSlider, XWUIInputText, XWUISegmentedControl, XWUITag } from "../../xwui";
import { glass } from "../studio/common";
import type { ViewContext } from "./view";

const words = catalog.views.sim;
const TICK_MS = 100;

function clock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
}

export function mount(context: ViewContext): void {
  const { view, stage, footer, scope } = context;
  const model: SimulationModel = { ...view.simulation };
  let state: SimulationState = createSimulation(model);
  let speed = 10;
  let playing = true;

  /* Stage: badges, clock and the stations with live counts. */
  const top = el("div", "xwflow-row xwflow-gap-12 xwflow-wrap");
  stage.append(top);
  scope.track(new XWUITag(slot(top), { label: words.badge }, { size: "small", className: "xwflow-tag xwflow-tag--amber" }));
  scope.track(new XWUITag(slot(top), { label: words.sample }, { size: "small", className: "xwflow-tag xwflow-tag--plan" }));
  const clockLine = el("span", "xwflow-mono xwflow-small xwflow-push");
  top.append(clockLine);

  const line = el("div", "xwflow-sim");
  line.setAttribute("role", "img");
  line.setAttribute("aria-label", words.stageLabel);
  stage.append(line);
  const station = (key: keyof typeof words.stations, group: string): HTMLElement => {
    const node = el("div", "xwflow-sim__station");
    node.dataset.group = group;
    node.append(el("b", undefined, words.stations[key]));
    const count = el("span", "xwflow-sim__count xwflow-display", "0");
    node.append(count);
    line.append(node);
    return count;
  };
  const arrivals = station("arrive", "trigger");
  const queue = station("queue", "control");
  const lookup = station("lookup", "integration");
  const decide = station("decide", "control");
  const alerts = station("alert", "ai");
  const logged = station("log", "data");
  const dots = el("div", "xwflow-sim__dots");
  line.append(dots);

  /* Bottom: controls and live results. */
  const controls = glass(footer, { pad: "m", className: "xwflow-stack xwflow-gap-12 xwflow-sim__controls", label: words.controls });
  const buttons = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  controls.append(buttons);
  const play = scope.track(new XWUIButton(slot(buttons), { text: "" }, { variant: "primary", size: "sm", icon: "pause", ariaLabel: words.pause, title: words.pause }));
  const once = scope.track(new XWUIButton(slot(buttons), { text: "" }, { variant: "ghost", size: "sm", icon: "skip-forward", ariaLabel: words.step, title: words.step, className: "xwflow-btn-glass" }));
  const restart = scope.track(new XWUIButton(slot(buttons), { text: "" }, { variant: "ghost", size: "sm", icon: "rotate-ccw", ariaLabel: words.restart, title: words.restart, className: "xwflow-btn-glass" }));
  const speeds = scope.track(
    new XWUISegmentedControl(slot(buttons, "xwflow-segmented xwflow-push"), { value: String(speed) }, { options: words.speeds.map((item) => ({ ...item })), ariaLabel: words.speedLabel }),
  );
  scope.track(new XWUIInputText(slot(controls), { label: words.arrival, value: fill(words.arrivalValue, { n: model.arrivalsPerHour }) }, { readonly: true, fullWidth: true, className: "xwflow-mono-input" }));
  scope.track(new XWUIInputText(slot(controls), { label: words.service, value: fill(words.serviceValue, { n: model.serviceSeconds }) }, { readonly: true, fullWidth: true, className: "xwflow-mono-input" }));
  const workerRow = el("div", "xwflow-row xwflow-gap-12");
  controls.append(workerRow);
  workerRow.append(el("span", "xwflow-label", words.workers));
  const workers = scope.track(new XWUIInputSlider(slot(workerRow, "xwflow-grow"), { value: model.workers }, { min: 1, max: 12, step: 1, ariaLabel: words.workers }));
  const workerCount = el("b", "xwflow-mono", String(model.workers));
  workerRow.append(workerCount);

  const results = el("div", "xwflow-stack xwflow-gap-16 xwflow-sim__results");
  footer.append(results);
  const kpis = el("div", "xwflow-grid");
  kpis.style.setProperty("--xwflow-min", "160px");
  results.append(kpis);
  const done = scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.done, value: 0 }, { tone: "green" }));
  const wait = scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.wait, value: null, emptyLabel: "–" }, { tone: "amber" }));
  const use = scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.use, value: null, emptyLabel: "0%" }, { tone: "cyan" }));
  const sent = scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.alerts, value: 0 }, { tone: "pink" }));
  const queuePanel = glass(results, { pad: "s", className: "xwflow-stack xwflow-gap-8" });
  const queueHead = el("div", "xwflow-row");
  queueHead.append(el("b", "xwflow-small", words.queue), el("span", "xwflow-xs xwflow-ter xwflow-push", words.queueWindow));
  queuePanel.append(queueHead);
  const chart = scope.track(new XWFlowSparkBars(slot(queuePanel), { bars: [], label: fill(words.queueLabel, { n: 0 }) }, { height: 80 }));

  const draw = (): void => {
    clockLine.textContent = fill(words.clock, { now: clock(state.minute), end: clock(model.hours * 60) });
    arrivals.textContent = formatNumber(state.served + state.queue);
    queue.textContent = formatNumber(state.queue);
    lookup.textContent = formatNumber(state.busy.length);
    decide.textContent = formatNumber(state.done);
    alerts.textContent = formatNumber(state.alerts);
    logged.textContent = formatNumber(state.done - state.alerts);
    dots.replaceChildren(...Array.from({ length: Math.min(40, state.queue) }, () => el("i")));
    done.setData({ label: words.kpis.done, value: state.done });
    const average = averageWaitMinutes(state);
    wait.setData({ label: words.kpis.wait, value: null, emptyLabel: average === null ? "–" : fill(words.waitValue, { n: average.toFixed(1) }) });
    use.setData({ label: words.kpis.use, value: null, emptyLabel: `${Math.round(workerUse(state, model) * 100)}%` });
    sent.setData({ label: words.kpis.alerts, value: state.alerts });
    chart.setData({ bars: state.queueHistory.map((value) => ({ value, alert: value > model.workers * 2 })), label: fill(words.queueLabel, { n: state.queue }) });
  };

  const advance = (minutes: number): void => {
    for (let index = 0; index < minutes && !finished(state, model); index += 1) state = step(state, model);
    draw();
    if (finished(state, model)) setPlaying(false);
  };

  const setPlaying = (next: boolean): void => {
    playing = next;
    play.updateConfig({ icon: playing ? "pause" : "play", ariaLabel: playing ? words.pause : words.play, title: playing ? words.pause : words.play });
  };

  let carry = 0;
  const timer = setInterval(() => {
    if (!playing) return;
    carry += (speed * TICK_MS) / 1000;
    const whole = Math.floor(carry);
    carry -= whole;
    if (whole) advance(whole);
  }, TICK_MS);
  scope.track({ destroy: () => clearInterval(timer) });

  play.onClick(() => setPlaying(!playing));
  once.onClick(() => {
    setPlaying(false);
    advance(1);
  });
  restart.onClick(() => {
    state = createSimulation(model);
    draw();
    setPlaying(true);
  });
  speeds.onChange?.((value: string) => (speed = Number(value)));
  workers.onChange((value) => {
    model.workers = Math.round(Number(value));
    workerCount.textContent = String(model.workers);
  });

  context.setExport(() => {
    const report = { model, minute: state.minute, done: state.done, alerts: state.alerts, queue: state.queue, workerUse: workerUse(state, model), averageWaitMinutes: averageWaitMinutes(state) };
    downloadText("simulation.json", JSON.stringify(report, null, 2), "application/json");
    notify(fill(catalog.views.exported, { name: "simulation.json" }), "success");
  });

  draw();
  // Open on the first simulated hour, as the prototype does.
  advance(60);
  setPlaying(true);
}
