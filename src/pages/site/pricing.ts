import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { siteHref } from "../../app/site-links";
import type { ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Cell, PricingTier } from "../../types/domain";
import {
  band,
  button,
  cell,
  centred,
  eyebrow,
  glass,
  grid,
  headline,
  icon,
  measure,
  row,
  separator,
  shape,
  stack,
  tag,
  text,
  ticks,
  type Node,
} from "../../ui/kit";
import type { XWUIButton, XWUIInputText } from "../../xwui";

const words = catalog.site.pricing;

function price(tier: PricingTier): Node {
  if (tier.price.kind === "free") return text("disp", words.free);
  if (tier.price.kind === "quote") {
    const amount = tier.price.amount === null ? tag(words.pricePlaceholder, "lime") : text("disp", String(tier.price.amount), { tone: "gradient" });
    const unit = row([text("small", words.per, { tone: "secondary" }), tier.price.unit === null ? tag(words.unitPlaceholder, "lime") : text("small", tier.price.unit, { tone: "secondary" })], { gap: 6 });
    return row([amount, unit], { gap: 8 });
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
    config: { surface: "glass", padding: 28, glow: tier.highlighted ? "violet" : undefined, gradientBorder: tier.highlighted, overflow: "clip" },
    slots: {
      children: stack(
        [
          ...(tier.highlighted ? [shape("halo", "violet", 240, { right: "-80px", top: "-80px" })] : []),
          stack([row([tag(tier.tag.label, tier.tag.color)]), text("h3", tier.name), text("small", tier.blurb, { tone: "secondary" })], { gap: 8 }),
          price(tier),
          cta,
          separator(),
          ticks(tier.features, tier.tag.color),
          ...(tier.planned ? [row([tag(words.planned, "plan")])] : []),
        ],
        { gap: 20 },
      ),
    },
  };
}

function cellNode(value: Cell): Node {
  if (value.kind === "included") return row([icon("check", 16, "var(--accent-primary)"), text("small", words.included)], { gap: 8 });
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
    { gap: 16 },
  );
  return {
    tag: "xwui-box",
    key: "band-contact",
    config: { surface: "glass", gradientBorder: true, padding: 40, overflow: "clip", ariaLabel: words.contactLabel, role: "form" },
    slots: {
      children: stack(
        [
          shape("cube", "violet", 60, { right: "8%", top: "30px" }),
          grid([stack([headline("h2", words.contactTitle, words.contactHighlight), text("body", words.contactBody, { tone: "secondary" })], { gap: 16 }), form], 380, 40),
        ],
        { gap: 0 },
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
    config: { as: "section", position: "relative", padding: "80px 0 40px" },
    slots: {
      children: stack(
        [
          shape("ring", "violet", 220, { left: "8%", top: "40px" }, 8),
          shape("orb", "pink", 80, { right: "12%", top: "60px" }),
          shape("orb", "cyan", 46, { right: "24%", top: "220px" }),
          {
            tag: "xwui-container",
            config: { maxWidth: 1280, center: true, padding: "0 24px" },
            slots: {
              children: stack(
                [centred(eyebrow(words.eyebrow)), headline("h1", words.title, words.titleHighlight, "center"), measure(text("lead", words.lead, { align: "center" }))],
                { gap: 24, align: "stretch" },
              ),
            },
          },
        ],
        { gap: 0 },
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
    band("compare", [stack([eyebrow(words.compareEyebrow), text("h2", words.compareTitle), text("body", words.compareBody, { tone: "secondary" })], { gap: 12 }), glass(table, { pad: "none" })], {
      gap: 24,
    }),
    band("contact", [contact()]),
  ];
}
