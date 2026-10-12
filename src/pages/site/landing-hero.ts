/**
 * The landing hero: the headline, the 3D sandbox that plays a sample run,
 * and its live receipt.
 */
import { fill, formatMs } from "../../app/format";
import { href, paths } from "../../app/router";
import { siteHref } from "../../app/site-links";
import { resultView } from "../../app/status";
import type { ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Attempt, Landing } from "../../types/domain";
import { canvasData, toneOf } from "../../ui/flow";
import { button, decoration, glass, headline, icon, inset, measure, row, sides, stack, status, tag, text, type Node, type StatusTone } from "../../ui/kit";
import { pageMax } from "../../ui/layout";
import type { XWUIComposer, XWUIFlowScene } from "../../xwui";

const words = catalog.site.landing;
const STEP_MS = 700;
const recorded = (attempts: Attempt[]): Attempt[] => attempts.filter((item) => item.result.kind !== "notRun" && item.result.kind !== "disabled");

/* ── hero and the 3D sandbox ───────────────────────────────────────── */

function receiptLines(attempts: Attempt[], runningNext: Attempt | null): Node[] {
  const line = (attempt: Attempt, tone: StatusTone, value: string): Node =>
    row(
      [
        row([status(tone, "", resultView(attempt.result).label), text("small", tryLabel(attempt))]),
        text("xs", value, { mono: true, tone: "tertiary" }),
      ],
      { justify: "space-between" },
    );
  const lines = attempts.map((attempt) =>
    line(
      attempt,
      toneOf[resultView(attempt.result).tone],
      attempt.result.kind === "failed"
        ? String(attempt.result.code)
        : attempt.result.kind === "branch"
          ? attempt.result.branch
          : attempt.durationMs !== null
            ? formatMs(attempt.durationMs)
            : resultView(attempt.result).label.toLocaleLowerCase(),
    ),
  );
  if (runningNext) lines.push(line(runningNext, "running", words.scene.running.toLocaleLowerCase()));
  return lines;
}

function tryLabel(attempt: Attempt): string {
  return attempt.tryCount && attempt.tryCount > 1 ? fill(words.scene.tryLine, { step: attempt.step, n: attempt.tryIndex ?? 1 }) : attempt.step;
}

export function hero(context: ViewContext, landing: Landing): Node {
  const text_ = words.scene;
  // The hero shows the flow itself; notes and frames stay in the editor.
  const graph = { ...landing.flow.graph, notes: [], frames: [] };
  const attempts = recorded(landing.receipt?.attempts ?? []);
  const timers: number[] = [];
  context.onLeave(() => timers.splice(0).forEach((id) => clearTimeout(id)));

  /** The scene and receipt after `played` attempts, with the next one running. */
  const frame = (played: number): { scene: Record<string, unknown>; receipt: Node } => {
    const visible = attempts.slice(0, played);
    const runningNext = played < attempts.length ? attempts[played] : null;
    const latest = new Map<string, Attempt>();
    for (const attempt of visible) latest.set(attempt.nodeId, attempt);
    const scene = canvasData(graph, { selectedId: runningNext?.nodeId ?? null, attempts: [...latest.values()] });
    if (runningNext) {
      scene.nodes = (scene.nodes as Array<Record<string, unknown>>).map((node) =>
        node.id === runningNext.nodeId ? { ...node, status: { tone: "running", label: text_.running } } : node,
      );
    }
    const receipt = stack(
      [row([text("small", text_.receipt, { bold: true }), tag(text_.sample, "plan")], { justify: "space-between" }), stack(receiptLines(visible, runningNext), { gap: "s" })],
      { gap: "s" },
    );
    return { scene, receipt };
  };

  const show = (played: number): void => {
    const next = frame(played);
    context.instance<XWUIFlowScene>("sandbox-scene")?.setData(next.scene);
    context.instance<XWUIComposer>("sandbox-receipt")?.setTree(next.receipt);
  };
  const play = (): void => {
    timers.splice(0).forEach((id) => clearTimeout(id));
    show(0);
    for (let step = 1; step <= attempts.length; step += 1) timers.push(window.setTimeout(() => show(step), step * STEP_MS));
  };
  const resting = Math.max(0, attempts.length - 1);
  const first = frame(resting);

  const asked = glass(
    stack([text("xs", text_.youAsked, { tone: "tertiary", bold: true, caps: true }), text("small", text_.request), row([tag(fill(text_.built, { n: graph.nodes.length }), "lime")])], { gap: "s" }),
    { pad: "s" },
  );
  const receipt = glass({ tag: "xwui-composer", key: "sandbox-receipt", data: { tree: first.receipt } }, { pad: "s" });
  const tools = glass(
    row(
      [
        button("ghost", "", { icon: "rotate-ccw", label: text_.reset, size: "sm", onClick: () => {
          timers.splice(0).forEach((id) => clearTimeout(id));
          context.instance<XWUIFlowScene>("sandbox-scene")?.reset();
          show(resting);
        } }),
        button("ghost", "", { icon: "zoom-out", label: text_.zoomOut, size: "sm", onClick: () => context.instance<XWUIFlowScene>("sandbox-scene")?.zoom(1 / 1.15) }),
        button("ghost", "", { icon: "zoom-in", label: text_.zoomIn, size: "sm", onClick: () => context.instance<XWUIFlowScene>("sandbox-scene")?.zoom(1.15) }),
        button("primary", text_.run, { icon: "play", size: "sm", key: "sandbox-run", onClick: play }),
      ],
      { gap: "xs" },
    ),
    { pad: "none" },
  );

  const scene: Node = {
    tag: "xwui-flow-scene",
    key: "sandbox-scene",
    data: { ...first.scene, labels: { ...(first.scene.labels as object), canvas: text_.label } },
    config: { width: 1040, height: 560, nodeWidth: 190, orbit: true, sceneHeight: 620 },
    slots: { overlayStart: asked, overlayEnd: receipt, overlayBottom: tools },
  };

  const intro = stack(
    [
      {
        ...tag(words.badge, "lime", words.badgeTail, true),
        on: { click: () => (window.location.hash = href(paths.studio)) },
      },
      headline("mega", words.title, words.titleHighlight, "center"),
      measure(text("lead", words.lead, { align: "center" })),
      row([button("primary", words.primary, { size: "lg", href: siteHref("landing", "sandbox"), icon: "arrow-right", iconAfter: true }), button("gradient", words.secondary, { size: "lg", href: siteHref("selfHost") })], {
        gap: "m",
        wrap: true,
        justify: "center",
      }),
      row(
        words.proof.map((item) => row([icon("check", 16, "var(--accent-primary)"), text("small", item, { tone: "secondary" })])),
        { gap: "l", wrap: true, justify: "center" },
      ),
    ],
    { gap: "xl", align: "center" },
  );

  return {
    tag: "xwui-box",
    key: "band-how",
    config: { as: "section", position: "relative", padding: inset("xxxl", "none") },
    slots: {
      children: stack(
        [
          decoration("landing.halo"),
          decoration("landing.halo2"),
          { tag: "xwui-container", config: { maxWidth: pageMax, center: true, padding: sides("xl") }, slots: { children: intro } },
          {
            tag: "xwui-box",
            key: "band-sandbox",
            config: { position: "relative" },
            slots: {
              children: stack(
                [
                  decoration("landing.cube"),
                  decoration("landing.orb"),
                  decoration("landing.orb2"),
                  scene,
                ],
                { gap: "none" },
              ),
            },
          },
        ],
        { gap: "none" },
      ),
    },
  };
}

/* ── stats, marquee ────────────────────────────────────────────────── */
