import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatMs } from "../../app/format";
import type { Tracker } from "../../app/mount";
import type { PageContext } from "../../app/page";
import { revealSection } from "../../app/site-links";
import { resultView } from "../../app/status";
import { XWFlowScene3D } from "../../components/XWFlowScene3D/XWFlowScene3D";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { catalog } from "../../content/catalog";
import type { Attempt, Landing, StatusTone } from "../../types/domain";
import { XWUIButton, XWUIIcon, XWUITag } from "../../xwui";
import { canvasData } from "../studio/canvas";
import { headline, linkButton } from "./common";
import { renderLandingSections } from "./landing-sections";

type LandingRoute = Extract<PageContext["route"], { zone: "site" }>;

const words = catalog.site.landing;
const STEP_MS = 700;

export async function render(context: PageContext<LandingRoute>): Promise<void> {
  const { scope, body, route } = context;
  const landing = await api.getLanding();

  renderHero(body, scope, landing);
  renderLandingSections(body, scope, landing);
  revealSection(body, route.section);
}

function renderHero(body: HTMLElement, scope: Tracker, landing: Landing): void {
  const hero = el("section", "xwflow-hero");
  hero.dataset.section = "how";
  body.append(hero);
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 520, color: "violet", place: { left: "-120px", top: "-60px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 460, color: "cyan", place: { right: "-80px", top: "60px" } }));

  const intro = el("div", "xwflow-container xwflow-stack xwflow-gap-24 xwflow-center");
  hero.append(intro);
  const badge = el("a", "xwflow-badge-link");
  badge.href = "#/studio";
  intro.append(badge);
  scope.track(new XWUITag(slot(badge), { label: words.badge }, { size: "small", className: "xwflow-tag xwflow-tag--lime" }));
  badge.querySelector(".xwui-tag")?.append(el("span", "xwflow-ter", ` ${words.badgeTail}`));

  intro.append(headline("h1", "xwflow-h-mega", words.title, words.titleHighlight));
  intro.append(el("p", "xwflow-lead xwflow-measure", words.lead));
  const ctas = el("div", "xwflow-wrap xwflow-gap-12 xwflow-justify-center");
  intro.append(ctas);
  linkButton(slot(ctas), scope, words.primary, { site: "landing", section: "sandbox" }, "primary", "lg");
  linkButton(slot(ctas), scope, words.secondary, { site: "selfHost" }, "gradient", "lg");
  const proof = el("div", "xwflow-wrap xwflow-gap-16 xwflow-small xwflow-sec xwflow-justify-center");
  intro.append(proof);
  for (const text of words.proof) {
    const item = el("span", "xwflow-row xwflow-gap-8");
    const icon = el("span", "xwflow-lime");
    item.append(icon, text);
    scope.track(new XWUIIcon(icon, { name: "check" }, { size: "sm", decorative: true }));
    proof.append(item);
  }

  renderSandbox(hero, scope, landing);
}

/** The interactive hero: the sample flow on a 3D floor that plays its recorded receipt. */
function renderSandbox(hero: HTMLElement, scope: Tracker, landing: Landing): void {
  const text = words.scene;
  const stage = el("div", "xwflow-sandbox");
  stage.dataset.section = "sandbox";
  hero.append(stage);
  scope.track(new XWFlowShape(slot(stage), { kind: "cube" }, { size: 70, color: "cyan", place: { left: "9%", top: "60px" } }));
  scope.track(new XWFlowShape(slot(stage), { kind: "orb" }, { size: 90, color: "lime", place: { right: "11%", top: "40px" } }));
  scope.track(new XWFlowShape(slot(stage), { kind: "orb" }, { size: 54, color: "pink", place: { left: "18%", bottom: "120px" } }));

  // The hero shows the flow itself; notes and frames stay in the editor.
  const graph = { ...landing.flow.graph, notes: [], frames: [] };
  const attempts: Attempt[] = landing.receipt?.attempts ?? [];
  const sceneHost = slot(stage, "xwflow-sandbox__scene");
  const scene = scope.track(
    new XWFlowScene3D(sceneHost, canvasData(graph, null, []), { width: 1040, height: 560, nodeWidth: 190, orbit: true }),
  );

  /* "You asked" card */
  const asked = el("div", "xwflow-glass xwflow-sandbox__asked");
  asked.dataset.pad = "s";
  asked.append(el("span", "xwflow-xs xwflow-ter xwflow-strong xwflow-caps", text.youAsked), el("p", "xwflow-small", text.request));
  stage.append(asked);
  scope.track(new XWUITag(slot(asked), { label: fill(text.built, { n: graph.nodes.length }) }, { size: "small", className: "xwflow-tag xwflow-tag--lime" }));

  /* Live receipt card */
  const receipt = el("div", "xwflow-glass xwflow-sandbox__receipt");
  receipt.dataset.pad = "s";
  receipt.setAttribute("aria-live", "polite");
  stage.append(receipt);
  const receiptHead = el("div", "xwflow-row xwflow-gap-8");
  receiptHead.append(el("b", "xwflow-small", text.receipt));
  receipt.append(receiptHead);
  scope.track(new XWUITag(slot(receiptHead, "xwflow-push"), { label: text.sample }, { size: "small", className: "xwflow-tag xwflow-tag--plan" }));
  const lines = el("div", "xwflow-stack xwflow-gap-8");
  receipt.append(lines);

  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  const timers: number[] = [];
  scope.track({ destroy: () => timers.splice(0).forEach((id) => clearTimeout(id)) });

  /** Show the first `played` attempts, and the next one as running. */
  const show = (played: number): void => {
    owned.splice(0).forEach((item) => item.destroy());
    lines.replaceChildren();
    const recorded = attempts.filter((item) => item.result.kind !== "notRun" && item.result.kind !== "disabled");
    const visible = recorded.slice(0, played);
    const runningNext = played < recorded.length ? recorded[played] : null;
    for (const attempt of visible) lines.append(receiptLine(attempt, resultView(attempt.result).tone, owned));
    if (runningNext) lines.append(receiptLine(runningNext, "run", owned, text.running.toLocaleLowerCase()));
    const seen = new Map<string, Attempt>();
    for (const attempt of visible) seen.set(attempt.nodeId, attempt);
    const live = [...seen.values()];
    const data = canvasData(graph, runningNext?.nodeId ?? null, live);
    if (runningNext) data.views[runningNext.nodeId] = { ...data.views[runningNext.nodeId], status: { tone: "run", label: text.running } };
    scene.setData(data);
  };

  const play = (): void => {
    timers.splice(0).forEach((id) => clearTimeout(id));
    const total = attempts.filter((item) => item.result.kind !== "notRun" && item.result.kind !== "disabled").length;
    show(0);
    for (let step = 1; step <= total; step += 1) timers.push(window.setTimeout(() => show(step), step * STEP_MS));
  };

  const tools = el("div", "xwflow-sandbox__tools");
  tools.setAttribute("role", "toolbar");
  stage.append(tools);
  const tool = (icon: string, label: string, action: () => void): void => {
    const button = scope.track(new XWUIButton(slot(tools), { text: "" }, { variant: "ghost", size: "sm", icon, ariaLabel: label, title: label }));
    button.onClick(action);
  };
  tool("rotate-ccw", text.reset, () => {
    timers.splice(0).forEach((id) => clearTimeout(id));
    scene.reset();
    show(Math.max(0, attempts.length - 2));
  });
  tool("zoom-out", text.zoomOut, () => scene.zoom(1 / 1.15));
  tool("zoom-in", text.zoomIn, () => scene.zoom(1.15));
  const run = scope.track(new XWUIButton(slot(tools), { text: text.run }, { variant: "primary", size: "sm", icon: "play" }));
  run.onClick(play);

  show(Math.max(0, attempts.filter((item) => item.result.kind !== "notRun" && item.result.kind !== "disabled").length - 1));
}

function receiptLine(attempt: Attempt, tone: StatusTone, owned: Array<{ destroy(): void }>, runningLabel?: string): HTMLElement {
  const line = el("div", "xwflow-row xwflow-gap-8 xwflow-small");
  const status = el("span");
  owned.push(new XWFlowStatus(status, { tone, label: "" }));
  const label =
    attempt.tryCount && attempt.tryCount > 1 ? fill(words.scene.tryLine, { step: attempt.step, n: attempt.tryIndex ?? 1 }) : attempt.step;
  const value =
    runningLabel ??
    (attempt.result.kind === "failed"
      ? String(attempt.result.code)
      : attempt.result.kind === "branch"
        ? attempt.result.branch
        : attempt.durationMs !== null
          ? formatMs(attempt.durationMs)
          : resultView(attempt.result).label.toLocaleLowerCase());
  line.append(status, label, el("span", "xwflow-mono xwflow-xs xwflow-ter xwflow-push", value));
  return line;
}
