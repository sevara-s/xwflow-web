import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { siteHref } from "../../app/site-links";
import type { ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Cell, PricingTier } from "../../types/domain";
import { band, behind, button, cell, centred, decoration, eyebrow, glass, grid, headline, icon, inset, measure, row, separator, sides, space, stack, tag, text, ticks, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIInputText } from "../../xwui";

const words = catalog.site.pricing;

function price(tier: PricingTier): Node {
  if (tier.price.kind === "free") return text("disp", words.free);
  if (tier.price.kind === "quote") {
    const amount = tier.price.amount === null ? tag(words.pricePlaceholder, "lime") : text("disp", String(tier.price.amount), { tone: "gradient" });
    const unit = row([text("small", words.per, { tone: "secondary" }), tier.price.unit === null ? tag(words.unitPlaceholder, "lime") : text("small", tier.price.unit, { tone: "secondary" })], { gap: "s" });
    return row([amount, unit], { gap: "s" });
  }
  return tag(words.contactPlaceholder, "lime");
}

function tierCard(tier: PricingTier, context: ViewContext): Node {
  const target = tier.cta.target === "selfHost" ? siteHref("selfHost") : null;
  const look = tier.cta.style === "primary" ? "primary" : tier.cta.style === "glass" ? "glass" : "gradient";
  const cta = button(look, tier.cta.label, {
    size: "lg",
    href: target ?? undefined,
    onClick: target ? undefined : () => context.instance<{ focus(): void }>("contact-email")?.focus(),
  });
  cta.config = { ...cta.config, fullWidth: true };
  return {
    tag: "xwui-box",
    config: { surface: "glass", padding: space("xxl"), glow: tier.highlighted ? "violet" : undefined, gradientBorder: tier.highlighted, overflow: "clip" },
    slots: {
      children: behind(
        tier.highlighted ? [decoration("pricing.halo")] : [],
        stack(
          [
            stack([row([tag(tier.tag.label, tier.tag.color)]), text("h3", tier.name, { level: 2 }), text("small", tier.blurb, { tone: "secondary" })], { gap: "s" }),
            price(tier),
            cta,
            separator(),
            ticks(tier.features, tier.tag.color),
            ...(tier.planned ? [row([tag(words.planned, "plan")])] : []),
          ],
          { gap: "xl" },
        ),
      ),
    },
  };
}

function cellNode(value: Cell): Node {
  if (value.kind === "included") return row([icon("check", 16, "var(--accent-primary)"), text("small", words.included)], { gap: "s" });
  if (value.kind === "text") return text("small", value.text);
  return tag(fill(words.requires, { tier: value.tier }));
}

function contact(): Node {
  let sending = false;
  const send = async (context: { email?: XWUIInputText; need?: XWUIInputText; submit?: XWUIButton }): Promise<void> => {
    if (sending || !context.email || !context.need) return;
    sending = true;
    context.submit?.setLoading(true);
    try {
      const result = await api.requestQuote({ email: context.email.getValue().trim(), need: context.need.getValue().trim() });
      notify(fill(words.sent, { reference: result.reference }), "success");
      context.email.setValue("");
      context.need.setValue("");
    } catch (error) {
      notify(errorMessage(error), "warning");
    } finally {
      sending = false;
      context.submit?.setLoading(false);
    }
  };
  const fields: { email?: XWUIInputText; need?: XWUIInputText; submit?: XWUIButton } = {};
  const form = stack(
    [
      {
        tag: "xwui-input-text",
        key: "contact-email",
        data: { label: words.email, placeholder: words.emailPlaceholder },
        config: { type: "email", fullWidth: true, required: true },
        ref: (instance) => (fields.email = instance as XWUIInputText),
      },
      {
        tag: "xwui-input-text",
        data: { label: words.need, placeholder: words.needPlaceholder },
        config: { fullWidth: true, required: true },
        ref: (instance) => (fields.need = instance as XWUIInputText),
      },
      row([
        {
          ...button("primary", words.submit, { size: "lg", onClick: () => void send(fields) }),
          ref: (instance) => (fields.submit = instance as XWUIButton),
        },
      ]),
    ],
    { gap: "l" },
  );
  return {
    tag: "xwui-box",
    key: "band-contact",
    config: { surface: "glass", gradientBorder: true, padding: space("xxxl"), overflow: "clip", ariaLabel: words.contactLabel, role: "form" },
    slots: {
      children: stack(
        [
          decoration("pricing.cube"),
          grid([stack([headline("h2", words.contactTitle, words.contactHighlight), text("body", words.contactBody, { tone: "secondary" })], { gap: "l" }), form], 380, "xxxl"),
        ],
        { gap: "none" },
      ),
    },
  };
}

export async function view(context: ViewContext): Promise<Node[]> {
  const pricing = await api.getPricing();
  type Row = (typeof pricing.comparison)[number];

  const hero: Node = {
    tag: "xwui-box",
    key: "band-hero",
    config: { as: "section", position: "relative", padding: inset("hero", "xxxl") },
    slots: {
      children: stack(
        [
          decoration("pricing.ring"),
          decoration("pricing.orb"),
          decoration("pricing.orb2"),
          {
            tag: "xwui-container",
            config: { maxWidth: 1280, center: true, padding: sides("xl") },
            slots: {
              children: stack(
                [centred(eyebrow(words.eyebrow)), headline("h1", words.title, words.titleHighlight, "center"), measure(text("lead", words.lead, { align: "center" }))],
                { gap: "xl", align: "stretch" },
              ),
            },
          },
        ],
        { gap: "none" },
      ),
    },
  };

  const table: Node = {
    tag: "xwui-table",
    data: {
      columns: [
        { key: "capability", title: words.columns.capability, render: (_: unknown, item: Row) => cell(text("small", item.capability, { bold: true })) },
        { key: "core", title: words.columns.core, render: (_: unknown, item: Row) => cell(cellNode(item.core)) },
        { key: "commercial", title: words.columns.commercial, render: (_: unknown, item: Row) => cell(cellNode(item.commercial)) },
      ],
      data: pricing.comparison.map((item, index) => ({ ...item, key: String(index) })),
    },
    config: { hoverable: true, bordered: false, ariaLabel: words.compareLabel },
  };

  return [
    hero,
    band("tiers", [grid(pricing.tiers.map((tier) => tierCard(tier, context)), 300)], { tight: true }),
    band("compare", [stack([eyebrow(words.compareEyebrow), text("h2", words.compareTitle), text("body", words.compareBody, { tone: "secondary" })], { gap: "m" }), glass(table, { pad: "none" })], {
      gap: "xl",
    }),
    band("contact", [contact()]),
  ];
}
