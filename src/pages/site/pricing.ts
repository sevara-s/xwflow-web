import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { revealSection, siteHref } from "../../app/site-links";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { catalog } from "../../content/catalog";
import type { Cell, PricingTier } from "../../types/domain";
import { XWUIButton, XWUIIcon, XWUIInputText, XWUITable, XWUITag } from "../../xwui";
import { eyebrow, headline, section } from "./common";

type SiteRoute = Extract<PageContext["route"], { zone: "site" }>;

const words = catalog.site.pricing;

export async function render(context: PageContext<SiteRoute>): Promise<void> {
  const { scope, body, route } = context;
  const pricing = await api.getPricing();

  const hero = el("section", "xwflow-hero xwflow-hero--page");
  body.append(hero);
  scope.track(new XWFlowShape(slot(hero), { kind: "ring" }, { size: 220, thickness: 8, place: { left: "8%", top: "40px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "orb" }, { size: 80, color: "pink", place: { right: "12%", top: "60px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "orb" }, { size: 46, color: "cyan", place: { right: "24%", top: "220px" } }));
  const intro = el("div", "xwflow-container xwflow-stack xwflow-gap-24 xwflow-center");
  hero.append(intro);
  eyebrow(intro, words.eyebrow);
  intro.append(headline("h1", "xwflow-h1", words.title, words.titleHighlight), el("p", "xwflow-lead xwflow-measure", words.lead));

  const tiers = el("div", "xwflow-container xwflow-grid xwflow-tiers");
  tiers.style.setProperty("--xwflow-min", "300px");
  body.append(tiers);
  for (const tier of pricing.tiers) tiers.append(renderTier(tier, scope));

  const compare = section(body, "compare");
  const head = el("div", "xwflow-stack xwflow-gap-12");
  compare.append(head);
  eyebrow(head, words.compareEyebrow);
  head.append(el("h2", "xwflow-h2", words.compareTitle), el("p", "xwflow-sec", words.compareBody));
  const tableHost = slot(compare, "xwflow-table");
  type Row = (typeof pricing.comparison)[number];
  const cell = (value: Cell): HTMLElement => {
    if (value.kind === "included") {
      const box = el("span", "xwflow-row xwflow-gap-8 xwflow-included");
      const icon = el("span");
      box.append(icon, words.included);
      scope.track(new XWUIIcon(icon, { name: "check" }, { size: "sm", decorative: true }));
      return box;
    }
    if (value.kind === "text") return el("span", undefined, value.text);
    const box = el("span");
    scope.track(new XWUITag(box, { label: fill(words.requires, { tier: value.tier }) }, { size: "small", className: "xwflow-tag" }));
    return box;
  };
  scope.track(
    new XWUITable(
      tableHost,
      {
        columns: [
          { key: "capability", title: words.columns.capability, render: (_: unknown, row: Row) => el("span", undefined, row.capability) },
          { key: "core", title: words.columns.core, render: (_: unknown, row: Row) => cell(row.core) },
          { key: "commercial", title: words.columns.commercial, render: (_: unknown, row: Row) => cell(row.commercial) },
        ],
        data: pricing.comparison.map((row, index) => ({ ...row, key: String(index) })),
      },
      { hoverable: true, bordered: false, ariaLabel: words.compareLabel },
    ),
  );

  renderContact(body, scope);
  revealSection(body, route.section);
}

function renderTier(tier: PricingTier, scope: Tracker): HTMLElement {
  const card = el("div", "xwflow-tier");
  if (tier.highlighted) card.dataset.highlighted = "";
  card.dataset.color = tier.tag.color;
  if (tier.highlighted) scope.track(new XWFlowShape(slot(card), { kind: "halo" }, { size: 240, color: "violet", place: { right: "-80px", top: "-80px" } }));
  const head = el("div", "xwflow-stack xwflow-gap-8 xwflow-relative");
  card.append(head);
  scope.track(new XWUITag(slot(head), { label: tier.tag.label }, { size: "small", className: `xwflow-tag xwflow-tag--${tier.tag.color}` }));
  head.append(el("h2", "xwflow-h3", tier.name), el("p", "xwflow-small xwflow-sec", tier.blurb));

  const price = el("div", "xwflow-row xwflow-gap-8 xwflow-relative");
  card.append(price);
  if (tier.price.kind === "free") price.append(el("span", "xwflow-tier__price", words.free));
  else if (tier.price.kind === "quote") {
    const amount = el("span", "xwflow-tier__price xwflow-grad-text");
    amount.append(tier.price.amount === null ? el("span", "xwflow-placeholder", words.pricePlaceholder) : String(tier.price.amount));
    const unit = el("span", "xwflow-small xwflow-sec");
    unit.append(`${words.per} `, tier.price.unit === null ? el("span", "xwflow-placeholder", words.unitPlaceholder) : tier.price.unit);
    price.append(amount, unit);
  } else {
    const amount = el("span", "xwflow-tier__price");
    amount.append(el("span", "xwflow-placeholder", words.contactPlaceholder));
    price.append(amount);
  }

  const cta = slot(card, "xwflow-relative");
  const href = tier.cta.target === "selfHost" ? siteHref("selfHost") : siteHref("pricing", "contact");
  const config =
    tier.cta.style === "primary"
      ? { variant: "primary" }
      : { variant: "ghost", className: tier.cta.style === "glass" ? "xwflow-btn-glass" : "xwflow-btn-gradient" };
  const button = scope.track(new XWUIButton(cta, { text: tier.cta.label }, { ...config, size: "lg", fullWidth: true }));
  if (tier.cta.target === "contact") {
    button.onClick(() => document.querySelector('[data-section="contact"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
  } else {
    button.onClick(() => (window.location.hash = href));
  }

  card.append(el("hr", "xwflow-sep"));
  const list = el("ul", "xwflow-ticks");
  for (const feature of tier.features) list.append(el("li", undefined, feature));
  card.append(list);
  if (tier.planned) scope.track(new XWUITag(slot(card), { label: words.planned }, { size: "small", className: "xwflow-tag xwflow-tag--plan" }));
  return card;
}

function renderContact(body: HTMLElement, scope: Tracker): void {
  const wrap = section(body, "contact");
  const panel = el("div", "xwflow-glass xwflow-clip xwflow-contact");
  panel.dataset.border = "gradient";
  wrap.append(panel);
  scope.track(new XWFlowShape(slot(panel), { kind: "cube" }, { size: 60, color: "violet", place: { right: "8%", top: "30px" } }));
  const text = el("div", "xwflow-stack xwflow-gap-16 xwflow-relative");
  panel.append(text);
  text.append(headline("h2", "xwflow-h2", words.contactTitle, words.contactHighlight), el("p", "xwflow-sec", words.contactBody));

  const form = el("form", "xwflow-stack xwflow-gap-16 xwflow-relative");
  form.setAttribute("aria-label", words.contactLabel);
  form.noValidate = true;
  panel.append(form);
  const email = scope.track(new XWUIInputText(slot(form), { label: words.email, placeholder: words.emailPlaceholder }, { type: "email", fullWidth: true, required: true }));
  const need = scope.track(new XWUIInputText(slot(form), { label: words.need, placeholder: words.needPlaceholder }, { fullWidth: true, required: true }));
  const submit = scope.track(new XWUIButton(slot(form), { text: words.submit }, { variant: "primary", size: "lg", type: "submit" }));
  const send = async (): Promise<void> => {
    submit.setLoading(true);
    try {
      const result = await api.requestQuote({ email: email.getValue().trim(), need: need.getValue().trim() });
      notify(fill(words.sent, { reference: result.reference }), "success");
      email.setValue("");
      need.setValue("");
    } catch (error) {
      notify(errorMessage(error), "warning");
    } finally {
      submit.setLoading(false);
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void send();
  });
}
