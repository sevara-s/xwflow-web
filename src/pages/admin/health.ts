import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import { button, row, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer } from "../../xwui";
import { content } from "./health-panels";

const words = catalog.admin.health;

type Dialog = { open(): void; close(): void };

export async function view(context: ViewContext): Promise<PageResult> {
  let health = await api.getHealth();
  const redraw = (): void =>
    context.instance<XWUIComposer>("health-content")?.setTree(content(health));

  /* Pausing and draining each ask first, in their own dialog that names what will stop. */
  const dialogs: Record<"pause" | "drain", Dialog | undefined> = {
    pause: undefined,
    drain: undefined,
  };
  const confirmDialog = (
    id: "pause" | "drain",
    title: string,
    body: string,
    action: string,
    run: () => Promise<void>,
  ): Node => ({
    tag: "xwui-dialog",
    data: { title },
    config: { size: "small", closable: true },
    slots: {
      content: text("body", body, { tone: "secondary" }),
      footer: row(
        [
          button("glass", words.cancel, {
            onClick: () => dialogs[id]?.close(),
          }),
          {
            tag: "xwui-button",
            key: `health-confirm-${id}`,
            data: { text: action },
            config: { variant: "danger", shape: "pill" },
            on: {
              click: async () => {
                const confirm = context.instance<XWUIButton>(
                  `health-confirm-${id}`,
                );
                confirm?.setLoading(true);
                try {
                  await run();
                  dialogs[id]?.close();
                } catch (error) {
                  notify(errorMessage(error), "danger");
                } finally {
                  confirm?.setLoading(false);
                }
              },
            },
          },
        ],
        { justify: "flex-end", gap: "s" },
      ),
    },
    ref: (instance) => (dialogs[id] = instance as Dialog),
  });
  const open = (id: "pause" | "drain"): void =>
    void setTimeout(() => dialogs[id]?.open(), 0);

  const again = async (): Promise<void> => {
    const button_ = context.instance<XWUIButton>("health-again");
    button_?.setLoading(true);
    try {
      health = await api.recheckHealth();
      redraw();
      notify(
        fill(words.checked, {
          n: health.checks.filter((check) => check.state !== "ok").length,
        }),
        "info",
      );
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      button_?.setLoading(false);
    }
  };

  return {
    bar: adminBar(context.admin!, "system", words.crumb, {
      actions: [
        button("gradient", words.checkAgain, {
          size: "sm",
          icon: "rotate-ccw",
          key: "health-again",
          onClick: () => void again(),
        }),
      ],
    }),
    body: [
      {
        tag: "xwui-composer",
        key: "health-content",
        data: { tree: content(health) },
      },
      row(
        [
          button("glass", words.pause, { onClick: () => open("pause") }),
          button("glass", words.drain, { onClick: () => open("drain") }),
          text("xs", words.confirmNote, { tone: "tertiary" }),
        ],
        { gap: "s", wrap: true },
      ),
      confirmDialog(
        "pause",
        words.pauseTitle,
        words.pauseBody,
        words.confirmPause,
        async () => {
          const result = await api.pauseSchedules();
          notify(fill(words.paused, { n: result.paused }), "success");
        },
      ),
      confirmDialog(
        "drain",
        words.drainTitle,
        words.drainBody,
        words.confirmDrain,
        async () => {
          const result = await api.drainWorker();
          notify(
            fill(words.drained, { worker: result.worker, n: result.remaining }),
            "success",
          );
          health = await api.getHealth();
          redraw();
        },
      ),
    ],
  };
}
