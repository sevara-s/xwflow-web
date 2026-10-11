import { api } from "../../api/client";
import { bestInk, contrastRatio, INK, parseHex, passesAA } from "../../app/contrast";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import { siteHref } from "../../app/site-links";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { BrandKit } from "../../types/domain";
import { button, cell, glass, grid, row, shape, space, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer, XWUIInputText, XWUISelect } from "../../xwui";

const words = catalog.admin.branding;
/** The kit's typefaces, in order, map onto the preview's three faces. */
const faces = ["display", "text", "system"] as const;

type Changeable<T> = { onChange(handler: (value: T) => void): void };

function preview(kit: BrandKit): Node {
  return {
    tag: "xwui-brand-preview",
    data: {
      primary: kit.primary,
      productName: kit.productName || words.productName,
      assistantLabel: fill(words.previewAssistant, { name: kit.assistantName || words.assistantName }),
      itemName: words.previewFlow,
      itemTag: words.published,
      primaryAction: words.runFlow,
      secondaryAction: words.share,
      label: words.preview,
    },
    config: { typeface: faces[Math.max(0, kit.typefaces.indexOf(kit.typeface))] ?? "display" },
  };
}

function contrast(kit: BrandKit): Node {
  type Row = { key: string; pair: string; ratio: number | null };
  const rows: Row[] = [
    { key: "a", pair: words.pairs.darkOnPrimary, ratio: contrastRatio(INK.dark, kit.primary) },
    { key: "b", pair: words.pairs.primaryOnBackground, ratio: contrastRatio(kit.primary, kit.background) },
    { key: "c", pair: words.pairs.whiteOnPrimary, ratio: contrastRatio(INK.light, kit.primary) },
  ];
  return stack(
    [
      {
        tag: "xwui-table",
        data: {
          columns: [
            { key: "pair", title: words.columns.pair, render: (_: unknown, item: Row) => cell(text("small", item.pair)) },
            { key: "ratio", title: words.columns.ratio, align: "end", render: (_: unknown, item: Row) => cell(text("small", item.ratio === null ? "–" : fill(words.ratio, { n: item.ratio.toFixed(1) }), { mono: true })) },
            {
              key: "result",
              title: words.columns.result,
              render: (_: unknown, item: Row) => {
                const ok = item.ratio !== null && passesAA(item.ratio);
                return cell(status(item.ratio === null ? "warning" : ok ? "success" : "error", item.ratio === null ? words.invalid : ok ? words.passes : words.fails));
              },
            },
          ],
          data: rows,
        },
        config: { bordered: false, size: "small", ariaLabel: words.contrastLabel },
      },
      text("xs", fill(words.contrastNote, { ink: bestInk(kit.primary) === INK.light ? words.inkLight : words.inkDark }), { tone: "secondary" }),
    ],
    { gap: "m" },
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const kit = await api.getBranding();
  const core = kit.plan === "core";
  const draft: BrandKit = { ...kit };
  const refresh = (): void => {
    context.instance<XWUIComposer>("brand-preview")?.setTree(preview(draft));
    context.instance<XWUIComposer>("brand-contrast")?.setTree(contrast(draft));
  };
  const field = (label: string, value: string, onChange: (value: string) => void, options: { placeholder?: string; hint?: string } = {}): Node =>
    stack(
      [
        {
          tag: "xwui-input-text",
          data: { label, value, placeholder: options.placeholder },
          config: { fullWidth: true },
          ref: (instance) => (instance as XWUIInputText).onChange(onChange),
        },
        ...(options.hint ? [text("xs", options.hint, { tone: "tertiary" })] : []),
      ],
      { gap: "s" },
    );

  const save = async (): Promise<void> => {
    if (core) return;
    const saveButton = context.instance<XWUIButton>("brand-save");
    saveButton?.setLoading(true);
    try {
      await api.saveBranding({
        productName: draft.productName,
        assistantName: draft.assistantName,
        primary: draft.primary,
        typeface: draft.typeface,
        removeMarks: draft.removeMarks,
        domain: draft.domain,
      });
      notify(words.saved, "success");
    } catch (error) {
      notify(errorMessage(error), "warning");
    } finally {
      saveButton?.setLoading(false);
    }
  };

  const form = glass(
    stack(
      [
        field(words.productName, draft.productName, (value) => {
          draft.productName = value;
          refresh();
        }),
        field(
          words.assistantName,
          draft.assistantName,
          (value) => {
            draft.assistantName = value;
            refresh();
          },
          { hint: words.assistantHint },
        ),
        grid(
          [
            [words.logo, words.uploadLogo],
            [words.favicon, words.uploadFavicon],
          ].map(([label, action]) => stack([text("small", label, { bold: true }), button("glass", action, { icon: "upload", onClick: () => notify(words.uploadsOff, "info") })], { gap: "s" })),
          160,
          "l",
        ),
        stack(
          [
            text("small", words.primary, { bold: true }),
            {
              tag: "xwui-input-color",
              data: { value: draft.primary },
              config: { presets: kit.swatches, pickerPresetLayout: "circles", ariaLabel: words.primaryHex },
              ref: (instance) =>
                (instance as Changeable<string>).onChange((value) => {
                  const hex = value.trim().toLowerCase();
                  if (!parseHex(hex)) return;
                  draft.primary = hex.startsWith("#") ? hex : `#${hex}`;
                  refresh();
                }),
            },
          ],
          { gap: "s" },
        ),
        {
          tag: "xwui-select",
          data: { label: words.typeface, value: draft.typeface, options: kit.typefaces.map((value) => ({ value, label: value })) },
          config: { fullWidth: true },
          ref: (instance) =>
            (instance as XWUISelect).onChange((value) => {
              draft.typeface = String(value);
              refresh();
            }),
        },
        row(
          [
            {
              tag: "xwui-switch",
              data: { checked: draft.removeMarks, label: "" },
              config: { size: "sm", ariaLabel: words.removeMarks },
              ref: (instance) => (instance as Changeable<boolean>).onChange((checked) => (draft.removeMarks = checked)),
            },
            stack([text("small", words.removeMarks, { bold: true }), text("xs", words.removeMarksBody, { tone: "secondary" })], { gap: "xs" }),
          ],
          { gap: "m" },
        ),
        field(words.domain, draft.domain, (value) => (draft.domain = value), { placeholder: words.domainPlaceholder, hint: words.domainHint }),
        { tag: "xwui-separator" },
        row(
          [
            { ...button("primary", words.save, { disabled: core, onClick: () => void save() }), key: "brand-save" },
            ...(core ? [tag(words.requires, "violet")] : []),
          ],
          { gap: "m" },
        ),
      ],
      { gap: "l" },
    ),
    { pad: "m" },
  );

  return {
    bar: adminBar(context.admin!, "admin", catalog.admin.rail.admin.find((item) => item.id === "branding")?.label ?? words.title, { sample: false, plan: true }),
    body: [
      row([text("h2", words.title), text("h2", words.titleHighlight, { tone: "gradient" })], { gap: "m" }),
      text("lead", words.lead),
      ...(core
        ? [
            glass(
              row(
                [
                  row([status("warning", words.gate), text("small", words.gateBody, { tone: "secondary" })], { gap: "m", wrap: true }),
                  button("glass", words.seePlans, { size: "sm", href: siteHref("pricing") }),
                ],
                { justify: "space-between", wrap: true, gap: "m" },
              ),
              { pad: "s" },
            ),
          ]
        : []),
      {
        tag: "xwui-grid",
        config: { columns: "minmax(0, 1fr)", gap: space("xl"), alignItems: "start", responsive: { lg: { columns: "minmax(0, 1fr) minmax(0, 1fr)" } } },
        slots: {
          children: [
            form,
            stack(
              [
                {
                  tag: "xwui-box",
                  config: { surface: "glass", overflow: "clip", position: "relative", padding: space("xl") },
                  slots: {
                    children: stack(
                      [
                        shape("halo", "pink", 320, { left: "25%", top: "60px" }),
                        row([text("body", words.preview, { bold: true }), tag(words.notSaved, "plan")], { justify: "space-between" }),
                        { tag: "xwui-composer", key: "brand-preview", data: { tree: preview(draft) } },
                      ],
                      { gap: "none" },
                    ),
                  },
                },
                glass(stack([text("h3", words.contrast), { tag: "xwui-composer", key: "brand-contrast", data: { tree: contrast(draft) } }], { gap: "m" }), { pad: "m" }),
              ],
              { gap: "l" },
            ),
          ],
        },
      },
    ],
  };
}
