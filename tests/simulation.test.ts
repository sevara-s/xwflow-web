import { describe, expect, it } from "vitest";
import { arrivalsPerMinute, averageWaitMinutes, createSimulation, finished, nextRandom, step, workerUse } from "../src/app/simulation";
import type { SimulationModel } from "../src/types/domain";

const model: SimulationModel = { arrivalsPerHour: 240, serviceSeconds: 50, workers: 4, overShare: 0.32, hours: 8, seed: 7 };

function run(minutes: number, m = model) {
  let state = createSimulation(m);
  for (let index = 0; index < minutes; index += 1) state = step(state, m);
  return state;
}

describe("simulation", () => {
  it("is deterministic for a seed", () => {
    expect(run(90)).toEqual(run(90));
    expect(nextRandom(7)[0]).toBe(nextRandom(7)[0]);
  });

  it("peaks arrivals in the middle of the hour", () => {
    expect(arrivalsPerMinute(model, 30)).toBeGreaterThan(arrivalsPerMinute(model, 0) * 3);
  });

  it("does not change the state it is given", () => {
    const start = createSimulation(model);
    const copy = structuredClone(start);
    step(start, model);
    expect(start).toEqual(copy);
  });

  it("builds a queue at the peak and drains it afterwards", () => {
    const peak = run(35);
    const after = run(60);
    expect(peak.queue).toBeGreaterThan(0);
    expect(after.queue).toBeLessThan(peak.queue);
  });

  it("serves more with more workers", () => {
    const few = run(60, { ...model, workers: 2 });
    const many = run(60, { ...model, workers: 8 });
    expect(many.done).toBeGreaterThan(few.done);
    expect(averageWaitMinutes(many) ?? 0).toBeLessThan(averageWaitMinutes(few) ?? Infinity);
  });

  it("reports worker use between 0 and 1, alerts below done, and finishes after the model's hours", () => {
    const state = run(60);
    expect(workerUse(state, model)).toBeGreaterThan(0);
    expect(workerUse(state, model)).toBeLessThanOrEqual(1);
    expect(state.alerts).toBeLessThanOrEqual(state.done);
    expect(finished(state, model)).toBe(false);
    expect(finished(run(480), model)).toBe(true);
  });
});
