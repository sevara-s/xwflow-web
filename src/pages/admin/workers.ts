import { api } from "../../api/client";
import { fill, formatAgo } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Worker, WorkerState } from "../../types/domain";
import { button, glass, grid, iconTile, row, stack, status, tag, text, type Hue, type Node, type StatusTone } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";
import { pageHead } from "./console-view";

const words = catalog.console.workers;
const stateTone: Record<WorkerState, StatusTone> = { busy: "running", idle: "success", draining: "warning" };
const stateHue: Record<WorkerState, Hue> = { busy: "cyan", idle: "lime", draining: "amber" };

export async function view(context: ViewContext): Promise<PageResult> {
  let workers = (await api.listWorkers()).workers;

  async function reload(): Promise<void> {
    try {
      workers = (await api.listWorkers()).workers;
      context.instance<XWUIComposer>("worker-grid")?.setTree(board());
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  }

  const act = async (worker: Worker): Promise<void> => {
    try {
      if (worker.state === "draining") {
        await api.resumeWorker(worker.id);
        notify(fill(words.resumed, { name: worker.id }), "success");
      } else {
        const { remaining } = await api.drainWorker(worker.id);
        notify(fill(words.drained, { name: worker.id, n: remaining }), "info");
      }
    } catch (error) {
      notify(errorMessage(error), "warning");
    }
    await reload();
  };

  const card = (worker: Worker): Node =>
    glass(
      stack(
        [
          row([row([iconTile("bot", stateHue[worker.state], "sm"), text("h4", worker.id, { level: 2 })], { gap: "m" }), status(stateTone[worker.state], words.states[worker.state])], { justify: "space-between", wrap: true }),
          row([tag(worker.region), tag(fill(words.version, { v: worker.version }), "plan")], { gap: "s", wrap: true }),
          stack(
            [
              text("small", fill(words.inFlight, { n: worker.inFlight })),
              text("small", fill(words.cpu, { n: worker.cpu }), { tone: "secondary" }),
              text("xs", fill(words.heartbeat, { when: formatAgo(worker.heartbeatAt) }), { tone: "tertiary" }),
            ],
            { gap: "xs" },
          ),
          row([button("glass", worker.state === "draining" ? words.resume : words.drain, { size: "sm", icon: worker.state === "draining" ? "play" : "pause", onClick: () => void act(worker) })]),
        ],
        { gap: "l" },
      ),
      { pad: "m" },
    );

  const board = (): Node =>
    stack(
      [
        text("small", fill(words.summary, { alive: workers.filter((worker) => worker.state !== "draining").length, total: workers.length }), { tone: "secondary" }),
        grid(workers.map(card), 230),
      ],
      { gap: "l" },
    );

  return {
    bar: adminBar(context.admin!, "system", words.title),
    body: [...pageHead(words.title, words.lead), { tag: "xwui-composer", key: "worker-grid", data: { tree: board() } }],
  };
}
