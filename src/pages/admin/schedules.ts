import { api } from "../../api/client";
import { fill, formatAgo, formatIn } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import { adminBar } from "../../app/shells/admin-view";
import { runStatusView } from "../../app/status";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Schedule } from "../../types/domain";
import { toneOf } from "../../ui/flow";
import { button, glass, iconTile, row, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";
import { pageHead, toggle } from "./console-view";

const words = catalog.console.schedules;

export async function view(context: ViewContext): Promise<PageResult> {
  let schedules = (await api.listSchedules()).schedules;

  async function reload(): Promise<void> {
    try {
      schedules = (await api.listSchedules()).schedules;
      context.instance<XWUIComposer>("schedule-list")?.setTree(list());
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  }

  const setEnabled = async (schedule: Schedule, enabled: boolean): Promise<void> => {
    try {
      await api.setScheduleEnabled(schedule.flowId, enabled);
      notify(fill(enabled ? words.on : words.off, { name: schedule.flowName }), enabled ? "success" : "info");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
    await reload();
  };

  const runNow = async (schedule: Schedule): Promise<void> => {
    try {
      const run = await api.startRun(schedule.flowId, "production");
      notify(fill(words.started, { name: schedule.flowName }), "success");
      navigate(paths.run(run.id));
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const pauseAll = async (): Promise<void> => {
    try {
      const { paused } = await api.pauseSchedules();
      notify(fill(words.pausedAll, { n: paused }), "info");
      await reload();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  const item = (schedule: Schedule): Node => {
    const last = runStatusView(schedule.lastStatus);
    return glass(
      row(
        [
          row(
            [
              iconTile("clock", schedule.enabled ? "cyan" : "amber", "sm"),
              stack(
                [
                  row([text("small", schedule.flowName, { bold: true }), tag(words.cadences[schedule.cadence]), ...(schedule.enabled ? [] : [tag(words.paused, "amber")])], { gap: "s", wrap: true }),
                  row(
                    [
                      text("xs", schedule.enabled ? fill(words.next, { when: formatIn(schedule.nextAt) }) : words.paused, { tone: "secondary" }),
                      status(toneOf[last.tone], fill(words.last, { when: formatAgo(schedule.lastAt) })),
                    ],
                    { gap: "m", wrap: true },
                  ),
                ],
                { gap: "xs" },
              ),
            ],
            { gap: "m" },
          ),
          row(
            [
              button("glass", words.runNow, { size: "sm", icon: "play", onClick: () => void runNow(schedule) }),
              toggle(schedule.enabled, schedule.flowName, (on) => void setEnabled(schedule, on)),
            ],
            { gap: "l" },
          ),
        ],
        { justify: "space-between", wrap: true, gap: "m" },
      ),
      { pad: "s" },
    );
  };

  const list = (): Node => stack(schedules.map(item), { gap: "m" });

  return {
    bar: adminBar(context.admin!, "system", words.title, { actions: [button("glass", words.pauseAll, { size: "sm", icon: "pause", onClick: () => void pauseAll() })] }),
    body: [...pageHead(words.title, words.lead), { tag: "xwui-composer", key: "schedule-list", data: { tree: list() } }],
  };
}
