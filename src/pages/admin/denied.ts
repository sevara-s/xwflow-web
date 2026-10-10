import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, paths } from "../../app/router";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { catalog } from "../../content/catalog";
import { XWUIButton } from "../../xwui";
import { linkButton } from "../site/common";
import { mountAdminBar } from "./common";
import "./admin.css";

const words = catalog.admin.denied;
const stepColors = ["lime", "cyan"];

export async function render(context: PageContext): Promise<void> {
  const { scope, body } = context;
  const denial = await api.getAccessDenial();
  await mountAdminBar(context, "admin", denial.page, { sample: false });

  const page = el("div", "xwflow-denied");
  body.append(page);
  scope.track(new XWFlowShape(slot(page), { kind: "halo" }, { size: 420, color: "violet", place: { left: "10%", top: "-40px" } }));
  scope.track(new XWFlowShape(slot(page), { kind: "halo" }, { size: 360, color: "pink", place: { right: "8%", top: "120px" } }));

  const lock = el("div", "xwflow-denied__lock");
  lock.setAttribute("aria-hidden", "true");
  page.append(lock);
  scope.track(new XWFlowShape(slot(lock), { kind: "orb" }, { size: 110, color: "pink", place: { left: "35px", top: "35px" } }));
  scope.track(new XWFlowShape(slot(lock), { kind: "ring" }, { size: 180, thickness: 5, place: { left: "0", top: "0" } }));

  const panel = el("div", "xwflow-glass xwflow-stack xwflow-gap-24 xwflow-denied__panel");
  panel.dataset.border = "gradient";
  page.append(panel);
  const head = el("div", "xwflow-stack xwflow-gap-8 xwflow-center");
  panel.append(head);
  const title = el("h1", "xwflow-h2");
  title.append(`${words.titleBefore} `, el("span", "xwflow-grad-text", denial.page));
  head.append(title, el("p", "xwflow-sec", words.lead));

  const facts = el("div", "xwflow-grid");
  facts.style.setProperty("--xwflow-min", "160px");
  panel.append(facts);
  for (const [label, value] of [
    [words.missing, denial.missingRole],
    [words.yours, denial.yourRole],
    [words.grants, denial.grantedBy],
  ] as const) {
    const fact = el("div", "xwflow-glass xwflow-stack xwflow-gap-4");
    fact.dataset.pad = "s";
    fact.append(el("span", "xwflow-xs xwflow-ter xwflow-strong xwflow-caps", label), el("b", undefined, value));
    facts.append(fact);
  }

  const steps = el("ol", "xwflow-stack xwflow-gap-12 xwflow-denied__steps");
  panel.append(steps);
  words.steps.forEach((text, index) => {
    const step = el("li", "xwflow-row xwflow-gap-12");
    const number = el("b", "xwflow-denied__num", String(index + 1));
    number.dataset.color = stepColors[index % stepColors.length];
    step.append(number, el("p", "xwflow-small", fill(text, { role: denial.missingRole })));
    steps.append(step);
  });

  const actions = el("div", "xwflow-wrap xwflow-gap-12");
  panel.append(actions);
  const request = scope.track(new XWUIButton(slot(actions), { text: words.request }, { variant: "primary", size: "lg" }));
  request.onClick(async () => {
    request.setLoading(true);
    try {
      const result = await api.requestAccess(denial.missingRole);
      notify(fill(words.requested, { reference: result.reference, who: denial.grantedBy.toLocaleLowerCase() }), "success");
      request.setDisabled(true);
    } catch (error) {
      notify(errorMessage(error), "danger");
    } finally {
      request.setLoading(false);
    }
  });
  linkButton(slot(actions), scope, words.back, { href: href(paths.admin) }, "glass", "lg");
}
