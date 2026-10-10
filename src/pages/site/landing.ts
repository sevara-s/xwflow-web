import { api } from "../../api/client";
import { fill, formatMs, formatNumber } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, paths } from "../../app/router";
import { siteHref } from "../../app/site-links";
import { resultView } from "../../app/status";
import type { ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { AssistantDraft, Attempt, Landing, StepGroup } from "../../types/domain";
import { canvasData, hueOf, stepType, toneOf } from "../../ui/flow";
import {
  band,
  button,
  eyebrow,
  glass,
  grid,
  headline,
  icon,
  iconTile,
  keys,
  measure,
  row,
  shape,
  stack,
  status,
  tag,
  text,
  type Hue,
  type Node,
  type StatusTone,
} from "../../ui/kit";
import type { XWUIComposer, XWUIFlowScene } from "../../xwui";

const words = catalog.site.landing;
const STEP_MS = 700;
const recorded = (attempts: Attempt[]): Attempt[] => attempts.filter((item) => item.result.kind !== "notRun" && item.result.kind !== "disabled");

export async function view(context: ViewContext): Promise<Node[]> {
  const landing = await api.getLanding();
  return [
    hero(context, landing),
    stats(landing),
    marquee(landing),
    prompt(context),
    truth(landing),
    brand(landing),
    notations(landing),
    migrate(landing),
    start(context),
  ];
}

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

function hero(context: ViewContext, landing: Landing): Node {
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
      [row([text("small", text_.receipt, { bold: true }), tag(text_.sample, "plan")], { justify: "space-between" }), stack(receiptLines(visible, runningNext), { gap: 8 })],
      { gap: 8 },
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
    stack([text("xs", text_.youAsked, { tone: "tertiary", bold: true, caps: true }), text("small", text_.request), row([tag(fill(text_.built, { n: graph.nodes.length }), "lime")])], { gap: 8 }),
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
      { gap: 4 },
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
        gap: 12,
        wrap: true,
        justify: "center",
      }),
      row(
        words.proof.map((item) => row([icon("check", 16, "var(--accent-primary)"), text("small", item, { tone: "secondary" })])),
        { gap: 16, wrap: true, justify: "center" },
      ),
    ],
    { gap: 24, align: "center" },
  );

  return {
    tag: "xwui-box",
    key: "band-how",
    config: { as: "section", position: "relative", padding: "40px 0 0" },
    slots: {
      children: stack(
        [
          shape("halo", "violet", 520, { left: "-120px", top: "-60px" }),
          shape("halo", "cyan", 460, { right: "-80px", top: "60px" }),
          { tag: "xwui-container", config: { maxWidth: 1280, center: true, padding: "0 24px" }, slots: { children: intro } },
          {
            tag: "xwui-box",
            key: "band-sandbox",
            config: { position: "relative" },
            slots: {
              children: stack(
                [
                  shape("cube", "cyan", 70, { left: "9%", top: "60px" }),
                  shape("orb", "lime", 90, { right: "11%", top: "40px" }),
                  shape("orb", "pink", 54, { left: "18%", bottom: "120px" }),
                  scene,
                ],
                { gap: 0 },
              ),
            },
          },
        ],
        { gap: 0 },
      ),
    },
  };
}

/* ── stats, marquee ────────────────────────────────────────────────── */

function stats(landing: Landing): Node {
  const cells = words.stats.map((stat) => {
    const value = landing.stats[stat.id as keyof Landing["stats"]];
    const number =
      stat.id === "connectors"
        ? tag("N", "lime")
        : text("disp", "unit" in stat ? fill(stat.unit, { n: value }) : formatNumber(value), { tone: stat.id === "dialects" ? "gradient" : undefined });
    return stack([number, text("body", stat.label, { bold: true }), text("small", stat.note, { tone: "secondary" })], { gap: 4 });
  });
  return band("stats", [glass(grid(cells, 230), { pad: "l" })], { tight: true });
}

const tagHue: Record<StepGroup, Hue> = hueOf;

function marquee(landing: Landing): Node {
  return {
    tag: "xwui-display-marquee",
    key: "band-marquee",
    data: { items: landing.marquee.map((item) => ({ label: item.label, hue: tagHue[item.group] })) },
    config: { speed: 40, gap: 14, fade: true, pauseOnHover: true },
  };
}

/* ── prompt to flow ────────────────────────────────────────────────── */

function draftPanel(title: string, steps: Array<{ name: string; type: string; group: StepGroup }>, streamed: number): Node {
  const t = words.prompt;
  const items = steps.map((step, index) => {
    const type = stepType(step.type, step.group);
    const needs = step.type === "needsConnection";
    const tone: StatusTone = index < streamed ? (needs ? "warning" : "success") : index === streamed ? "running" : "neutral";
    return glass(
      row([row([iconTile(type.icon, tagHue[step.group], "sm"), stack([text("small", step.name, { bold: true }), text("xs", type.label, { tone: "secondary" })], { gap: 0 })], { gap: 12 }), status(tone, "", type.label)], {
        justify: "space-between",
      }),
      { pad: "s" },
    );
  });
  const done = streamed >= steps.length && steps.some((step) => step.type === "needsConnection");
  return stack(
    [
      row([row([text("body", t.draft, { bold: true }), tag(t.streaming, "violet")]), text("xs", fill(t.steps, { n: steps.length }), { tone: "tertiary" })], { justify: "space-between" }),
      stack(items, { gap: 12 }),
      ...(done ? [{ tag: "xwui-alert", data: { message: t.connect }, config: { variant: "success", size: "small" } }] : []),
    ],
    { gap: 16, key: title },
  );
}

function prompt(context: ViewContext): Node {
  const t = words.prompt;
  const timers: number[] = [];
  context.onLeave(() => timers.splice(0).forEach((id) => clearTimeout(id)));
  let request: string = t.example;

  const draft = async (value: string): Promise<void> => {
    timers.splice(0).forEach((id) => clearTimeout(id));
    request = value;
    context.instance<{ setData(d: object): void }>("prompt-request")?.setData({ text: value });
    try {
      const result: AssistantDraft = await api.draftFlow(value);
      const steps = result.graph.nodes.map((node) => ({ name: node.name, type: node.type, group: node.group }));
      const paint = (streamed: number) => context.instance<XWUIComposer>("prompt-draft")?.setTree(draftPanel(result.title, steps, streamed));
      steps.forEach((_, index) => timers.push(window.setTimeout(() => paint(index), index * 450)));
      timers.push(window.setTimeout(() => paint(steps.length), steps.length * 450));
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };
  timers.push(window.setTimeout(() => void draft(t.example), 0));

  const left = stack(
    [
      eyebrow(t.eyebrow),
      headline("h2", t.title, t.titleHighlight),
      text("lead", t.lead),
      glass(
        stack(
          [
            { ...text("small", t.example), key: "prompt-request" },
            row([tag(t.project), button("primary", t.build, { size: "sm", onClick: () => void draft(request) })], { justify: "space-between" }),
          ],
          { gap: 12 },
        ),
        { pad: "s" },
      ),
      row(
        t.chips.map((chip) => button("glass", chip, { size: "sm", onClick: () => void draft(chip) })),
        { wrap: true },
      ),
    ],
    { gap: 24 },
  );
  const right: Node = {
    tag: "xwui-box",
    config: { position: "relative" },
    slots: {
      children: stack([shape("halo", "violet", 360, { left: "10%", top: "10%" }), glass({ tag: "xwui-composer", key: "prompt-draft", data: { tree: draftPanel(t.draft, [], 0) } }, { glow: "violet" })], { gap: 0 }),
    },
  };
  return band("prompt", [grid([left, right], 440, 48)]);
}

/* ── built different (bento) ───────────────────────────────────────── */

function truth(landing: Landing): Node {
  const t = words.truth;
  const attempts = landing.receipt?.attempts.filter((item) => item.result.kind !== "notRun") ?? [];
  const tile = (label: string, hue: Hue, items: Node[]): Node => glass(stack([row([tag(label, hue)]), ...items], { gap: 16 }), { pad: "l" });

  const receipt = tile(t.receiptTag, "cyan", [
    stack([text("h3", t.receiptTitle), text("body", t.receiptBody, { tone: "secondary" })], { gap: 8 }),
    {
      tag: "xwui-run-waterfall",
      data: {
        label: t.receiptTitle,
        rows: attempts.map((item) => ({
          id: item.id,
          label: item.tryCount && item.tryCount > 1 ? `${item.step}, try ${item.tryIndex}` : item.step,
          startMs: item.result.kind === "disabled" ? null : item.offsetMs ?? 0,
          durationMs: item.result.kind === "disabled" ? null : item.durationMs ?? 0,
          caption: item.result.kind === "failed" ? String(item.result.code) : item.durationMs !== null ? formatMs(item.durationMs) : "",
          hue: item.group === "integration" ? "gradient" : hueOf[item.group],
          failed: item.result.kind === "failed",
          muted: item.result.kind === "disabled",
        })),
      },
      config: { layout: "columns" },
    },
  ]);
  const states = tile(t.statesTag, "violet", [
    text("h3", t.statesTitle),
    stack(t.states.map((state) => glass(status(toneOf[state.tone as keyof typeof toneOf], state.label), { pad: "s" })), { gap: 8 }),
  ]);
  const keyboard = tile(t.keysTag, "lime", [text("h3", t.keysTitle), row(t.keys.map((key) => keys([key])), { wrap: true }), text("small", t.keysBody, { tone: "secondary" })]);
  const languageWord = text("disp", t.languageWord, { tone: "gradient" });
  languageWord.config = { ...languageWord.config, fontSize: "3.4rem", attrs: { lang: "ar", dir: "rtl" } };
  const language = tile(t.languageTag, "pink", [languageWord, text("small", t.languageBody, { tone: "secondary" })]);
  const host = tile(t.hostTag, "orange", [
    text("h3", t.hostTitle),
    stack(
      t.hostRack.map((name) => glass(row([icon("server", 16, "var(--xwui-hue-orange, #ff8a3d)"), text("xs", name, { mono: true, tone: "secondary" })]), { pad: "s" })),
      { gap: 8 },
    ),
  ]);

  return band("truth", [
    stack([eyebrow(t.eyebrow), headline("h2", t.title, t.titleHighlight, "center")], { gap: 16, align: "center" }),
    { tag: "xwui-grid", data: { spans: [4, 2, 2, 2, 2] }, config: { columns: 6, gap: "20px", equalRowHeights: true }, slots: { children: [receipt, states, keyboard, language, host] } },
  ]);
}

/* ── white-label ───────────────────────────────────────────────────── */

function brand(landing: Landing): Node {
  const t = words.brand;
  const hues: Hue[] = ["cyan", "pink", "lime", "violet"];
  const left = stack(
    [
      eyebrow(t.eyebrow),
      headline("h2", t.title, t.titleHighlight),
      text("lead", t.lead),
      stack(
        t.items.map((item, index) => row([row([iconTile(item.icon, hues[index % hues.length], "sm", true), text("body", item.label)], { gap: 12 }), tag(t.planned, "plan")], { justify: "space-between" })),
        { gap: 12 },
      ),
      row([button("gradient", t.cta, { href: siteHref("pricing") })]),
    ],
    { gap: 24 },
  );
  const cards = landing.tenants.map((tenant, index) =>
    glass(
      stack(
        [
          row([iconTile("layers", (tenant.color as Hue) ?? "violet", "sm"), text("h4", tenant.name)]),
          row([button("glass", t.run, { size: "sm", disabled: true }), tag(t.published, tenant.color as Hue)]),
          { tag: "xwui-progress-bar", data: { value: 72 - index * 18 }, config: { size: "sm" } },
          ...(index === 1 ? [text("xs", t.noMark, { tone: "secondary" })] : []),
        ],
        { gap: 16 },
      ),
      { pad: "m", glow: index === 1 ? "violet" : undefined },
    ),
  );
  return band("brand", [grid([left, stack(cards, { gap: 16 })], 440, 48)]);
}

/* ── notations, migrate, start ─────────────────────────────────────── */

function notations(landing: Landing): Node {
  const t = words.notations;
  const family: Record<string, Hue | "plan"> = { automation: "lime", process: "orange", software: "pink", simulation: "amber", analysis: "plan", views: "cyan" };
  const target = (view: string): string =>
    view === "editor"
      ? href(paths.flow(landing.flow.id))
      : view === "receipt"
        ? href(paths.run(landing.receipt?.id ?? ""))
        : href(paths.flowView(landing.flow.id, view as never));
  const tags = landing.notations.map((notation) => {
    const node = tag(notation.name, notation.view ? family[notation.family] ?? "plan" : "plan");
    return notation.view ? { ...node, on: { click: () => (window.location.hash = target(notation.view as string)) } } : node;
  });
  const left = stack(
    [
      eyebrow(t.eyebrow),
      headline("h2", t.title, fill(t.titleHighlight, { n: landing.notations.length })),
      text("lead", t.lead),
      row([button("primary", t.gallery, { href: siteHref("notations") }), button("gradient", t.open3d, { href: href(paths.flowView(landing.flow.id, "3d")) })], { gap: 12, wrap: true }),
    ],
    { gap: 16 },
  );
  return band("notations", [
    {
      tag: "xwui-box",
      config: { surface: "glass", padding: 36, overflow: "clip" },
      slots: { children: stack([shape("halo", "pink", 420, { right: "-80px", bottom: "-160px" }), grid([left, row(tags, { wrap: true })], 440, 48)], { gap: 0 }) },
    },
  ]);
}

function migrate(landing: Landing): Node {
  const t = words.migrate;
  const hues: Hue[] = ["lime", "cyan", "violet", "pink", "orange"];
  const tiles = landing.dialects.map((dialect, index) =>
    glass(
      stack(
        [
          row([{ tag: "xwui-icon-tile", data: { icon: "git-merge", label: dialect.code }, config: { hue: hues[index % hues.length], size: "sm" } }, text("body", dialect.name, { bold: true })], { gap: 12 }),
          row([text("xs", t.depth, { tone: "secondary" }), tag(dialect.depth ?? t.pending, "lime")]),
        ],
        { gap: 12 },
      ),
      { pad: "m" },
    ),
  );
  return band("migrate", [
    row([stack([eyebrow(t.eyebrow), headline("h2", t.title, t.titleHighlight)], { gap: 16 }), text("body", t.body, { tone: "secondary" })], { gap: 24, wrap: true, align: "flex-end", justify: "space-between" }),
    grid(tiles, 220),
  ]);
}

function start(context: ViewContext): Node {
  const t = words.start;
  const content = stack(
    [
      eyebrow(t.eyebrow),
      headline("h1", t.title, t.titleHighlight),
      text("lead", t.lead),
      row(
        [
          button("primary", t.primary, {
            size: "lg",
            onClick: () => {
              context.instance<{ getElement(): HTMLElement | null }>("sandbox-scene")?.getElement()?.scrollIntoView({ behavior: "smooth", block: "center" });
              (context.instance<{ getElement(): HTMLElement | null }>("sandbox-run")?.getElement() as HTMLElement | null)?.click();
            },
          }),
          button("glass", t.secondary, { size: "lg", href: siteHref("selfHost") }),
        ],
        { gap: 12, wrap: true },
      ),
    ],
    { gap: 24 },
  );
  return band("start", [
    {
      tag: "xwui-box",
      config: { surface: "glass", gradientBorder: true, padding: 48, overflow: "clip" },
      slots: { children: stack([shape("ring", "violet", 260, { right: "6%", top: "-40px" }, 10), shape("orb", "lime", 70, { right: "18%", bottom: "40px" }), content], { gap: 0 }) },
    },
  ]);
}
