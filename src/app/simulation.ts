import type { SimulationModel } from "../types/domain";

/**
 * A small discrete-time model of the flow under load, one tick per
 * simulated minute. Orders arrive (busier in the middle of each hour),
 * wait for a free worker at the look-up step, then branch: a share sends
 * an alert. Seeded, so the same model always plays the same way.
 */
export interface SimulationState {
  minute: number;
  queue: number;
  busy: number[];
  done: number;
  alerts: number;
  waitedMinutes: number;
  served: number;
  busyWorkerMinutes: number;
  queueHistory: number[];
  rng: number;
}

export function createSimulation(model: SimulationModel): SimulationState {
  return {
    minute: 0,
    queue: 0,
    busy: [],
    done: 0,
    alerts: 0,
    waitedMinutes: 0,
    served: 0,
    busyWorkerMinutes: 0,
    queueHistory: [],
    rng: model.seed >>> 0,
  };
}

/** Mulberry32: a tiny seeded generator, returns [value in 0..1, next seed]. */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Arrival rate this minute: the hourly rate, peaking at three times the base mid-hour. */
export function arrivalsPerMinute(model: SimulationModel, minute: number): number {
  const phase = (minute % 60) / 60;
  const peak = Math.exp(-((phase - 0.5) ** 2) / 0.02);
  return (model.arrivalsPerHour / 60) * (0.5 + 2.5 * peak);
}

/** Advance one simulated minute. Returns a new state; the input is not changed. */
export function step(state: SimulationState, model: SimulationModel): SimulationState {
  let rng = state.rng;
  let draw: number;
  const rate = arrivalsPerMinute(model, state.minute);
  let arrivals = Math.floor(rate);
  [draw, rng] = nextRandom(rng);
  if (draw < rate - arrivals) arrivals += 1;

  const service = Math.max(1, Math.round(model.serviceSeconds / 60));
  let busy = state.busy.map((left) => left - 1).filter((left) => left > 0);
  const finished = state.busy.length - busy.length;
  let alerts = state.alerts;
  for (let index = 0; index < finished; index += 1) {
    [draw, rng] = nextRandom(rng);
    if (draw < model.overShare) alerts += 1;
  }

  let queue = state.queue + arrivals;
  let served = state.served;
  const startable = Math.min(queue, Math.max(0, model.workers - busy.length));
  busy = [...busy, ...Array.from({ length: startable }, () => service)];
  queue -= startable;
  served += startable;

  return {
    minute: state.minute + 1,
    queue,
    busy,
    done: state.done + finished,
    alerts,
    waitedMinutes: state.waitedMinutes + queue,
    served,
    busyWorkerMinutes: state.busyWorkerMinutes + busy.length,
    queueHistory: [...state.queueHistory, queue].slice(-60),
    rng,
  };
}

export function averageWaitMinutes(state: SimulationState): number | null {
  return state.served ? state.waitedMinutes / state.served : null;
}

export function workerUse(state: SimulationState, model: SimulationModel): number {
  return state.minute ? state.busyWorkerMinutes / (state.minute * Math.max(1, model.workers)) : 0;
}

export function finished(state: SimulationState, model: SimulationModel): boolean {
  return state.minute >= model.hours * 60;
}
