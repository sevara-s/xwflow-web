import { api } from "../../api/client";
import { bestInk, contrastRatio, parseHex, passesAA } from "../../app/contrast";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { siteHref } from "../../app/site-links";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { catalog } from "../../content/catalog";
import type { BrandKit } from "../../types/domain";
import { XWUIButton, XWUIInputSwitch, XWUIInputText, XWUISelect, XWUITable, XWUITag } from "../../xwui";
import { glass } from "../studio/common";
import { linkButton } from "../site/common";
import { mountAdminBar } from "./common";
import "./admin.css";

const words = catalog.admin.branding;

export async function render(context: PageContext): Promise<void> {
  const { scope, body } = context;
  await mountAdminBar(context, "admin", catalog.admin.rail.admin.find((item) => item.id === "branding")?.label ?? words.title, { sample: false, plan: true });
  const kit: BrandKit = await api.getBranding();
  const core = kit.plan === "core";

  const intro = el("div", "xwflow-stack xwflow-gap-4");
  body.append(intro);
  const title = el("h1", "xwflow-h2");
  title.append(`${words.title} `, el("span", "xwflow-grad-text", words.titleHighlight));
  intro.append(title, el("p", "xwflow-sec", words.lead));

  if (core) {
    const gate = el("div", "xwflow-band");
    gate.dataset.tone = "warn";
    const text = el("div", "xwflow-grow");
    text.append(el("b", undefined, words.gate), " ", words.gateBody);
    gate.append(text);
    body.append(gate);
    linkButton(slot(gate), scope, words.seePlans, { href: siteHref("pricing") }, "glass", "sm");
  }

  const split = el("div", "xwflow-branding");
  body.append(split);
  const form = el("form", "xwflow-glass xwflow-stack xwflow-gap-16 xwflow-branding__form");
  form.dataset.pad = "m";
  form.setAttribute("aria-label", words.formLabel);
  form.noValidate = true;
  split.append(form);
  const side = el("div", "xwflow-stack xwflow-gap-16 xwflow-branding__side");
  split.append(side);

  /* Live preview and contrast react to every edit. */
  const preview = renderPreview(side, scope);
  const contrast = renderContrast(side, scope);
  const draft = { ...kit };
  const refresh = (): void => {
    preview(draft);
    contrast(draft);
  };

  const product = scope.track(new XWUIInputText(slot(form), { label: words.productName, value: draft.productName }, { fullWidth: true }));
  product.onChange((value) => {
    draft.productName = value;
    refresh();
  });
  const assistantBox = el("div", "xwflow-stack xwflow-gap-4");
  form.append(assistantBox);
  const assistant = scope.track(new XWUIInputText(slot(assistantBox), { label: words.assistantName, value: draft.assistantName }, { fullWidth: true }));
  assistant.onChange((value) => {
    draft.assistantName = value;
    refresh();
  });
  assistantBox.append(el("p", "xwflow-hint", words.assistantHint));

  const uploads = el("div", "xwflow-grid");
  uploads.style.setProperty("--xwflow-min", "160px");
  form.append(uploads);
  for (const [label, action] of [
    [words.logo, words.uploadLogo],
    [words.favicon, words.uploadFavicon],
  ] as const) {
    const box = el("div", "xwflow-stack xwflow-gap-8");
    box.append(el("span", "xwflow-label", label));
    const button = scope.track(new XWUIButton(slot(box), { text: action }, { variant: "ghost", icon: "upload", fullWidth: true, className: "xwflow-btn-glass" }));
    button.onClick(() => notify(words.uploadsOff, "info"));
    uploads.append(box);
  }

  const colorBox = el("div", "xwflow-stack xwflow-gap-8");
  form.append(colorBox);
  colorBox.append(el("span", "xwflow-label", words.primary));
  const colorRow = el("div", "xwflow-row xwflow-gap-12 xwflow-wrap");
  colorBox.append(colorRow);
  const swatches: HTMLButtonElement[] = [];
  let hex: XWUIInputText | null = null;
  const markSwatches = (): void => {
    for (const swatch of swatches) swatch.setAttribute("aria-pressed", String(swatch.dataset.hex === draft.primary.toLowerCase()));
  };
  for (const color of kit.swatches) {
    const swatch = el("button", "xwflow-swatch");
    swatch.type = "button";
    swatch.dataset.hex = color.toLowerCase();
    swatch.style.setProperty("--xwflow-sc", color);
    swatch.setAttribute("aria-label", fill(words.swatch, { hex: color }));
    swatch.addEventListener("click", () => {
      draft.primary = color;
      hex?.setValue(color);
      markSwatches();
      refresh();
    });
    swatches.push(swatch);
    colorRow.append(swatch);
  }
  hex = scope.track(
    new XWUIInputText(slot(colorRow, "xwflow-branding__hex"), { value: draft.primary }, { ariaLabel: words.primaryHex, className: "xwflow-mono-input" }),
  );
  hex.onChange((value: string) => {
    if (parseHex(value)) draft.primary = value.trim().toLowerCase().startsWith("#") ? value.trim().toLowerCase() : `#${value.trim().toLowerCase()}`;
    markSwatches();
    refresh();
  });
  markSwatches();

  const typeface = scope.track(
    new XWUISelect(slot(form), { label: words.typeface, value: draft.typeface, options: kit.typefaces.map((value) => ({ value, label: value })) }, { fullWidth: true }),
  );
  typeface.onChange((value) => {
    draft.typeface = String(value);
    refresh();
  });

  const marks = el("div", "xwflow-row xwflow-gap-12");
  form.append(marks);
  const toggle = scope.track(new XWUIInputSwitch(slot(marks), { checked: draft.removeMarks, label: "" }, { size: "sm", ariaLabel: words.removeMarks }));
  toggle.onChange((checked) => {
    draft.removeMarks = checked;
    refresh();
  });
  const marksText = el("div", "xwflow-grow");
  marksText.append(el("b", "xwflow-small", words.removeMarks), el("div", "xwflow-xs xwflow-sec", words.removeMarksBody));
  marks.append(marksText);

  const domainBox = el("div", "xwflow-stack xwflow-gap-4");
  form.append(domainBox);
  const domain = scope.track(new XWUIInputText(slot(domainBox), { label: words.domain, placeholder: words.domainPlaceholder, value: draft.domain }, { fullWidth: true }));
  domain.onChange((value) => (draft.domain = value));
  domainBox.append(el("p", "xwflow-hint", words.domainHint));

  form.append(el("hr", "xwflow-sep"));
  const saveRow = el("div", "xwflow-row xwflow-gap-12");
  form.append(saveRow);
  const save = scope.track(new XWUIButton(slot(saveRow), { text: words.save }, { variant: "primary", type: "submit", disabled: core }));
  if (core) scope.track(new XWUITag(slot(saveRow), { label: words.requires }, { size: "small", className: "xwflow-tag" }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (core) return;
    try {
      save.setLoading(true);
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
      save.setLoading(false);
    }
  });

  refresh();
}

function renderPreview(side: HTMLElement, scope: Tracker): (kit: BrandKit) => void {
  const panel = glass(side, { className: "xwflow-branding__preview", label: words.preview });
  const head = el("div", "xwflow-row xwflow-gap-8 xwflow-branding__preview-head");
  panel.append(head);
  head.append(el("b", undefined, words.preview));
  scope.track(new XWUITag(slot(head, "xwflow-push"), { label: words.notSaved }, { size: "small", className: "xwflow-tag xwflow-tag--plan" }));
  const stage = el("div", "xwflow-branding__stage");
  panel.append(stage);
  scope.track(new XWFlowShape(slot(stage), { kind: "halo" }, { size: 320, color: "pink", place: { left: "25%", top: "40px" } }));
  const win = el("div", "xwflow-branding__window");
  stage.append(win);
  const bar = el("div", "xwflow-row xwflow-gap-8 xwflow-branding__bar");
  const mark = el("span", "xwflow-branding__mark");
  const name = el("b", "xwflow-display");
  const assistant = el("span", "xwflow-xs xwflow-push");
  bar.append(mark, name, assistant);
  const content = el("div", "xwflow-stack xwflow-gap-12 xwflow-branding__content");
  const flowRow = el("div", "xwflow-row xwflow-gap-8 xwflow-branding__flow");
  const flowName = el("span", undefined, words.previewFlow);
  const tag = el("span", "xwflow-branding__tag", words.published);
  flowRow.append(flowName, tag);
  const actions = el("div", "xwflow-row xwflow-gap-8");
  const run = el("span", "xwflow-branding__button", words.runFlow);
  const share = el("span", "xwflow-branding__button xwflow-branding__button--ghost", words.share);
  actions.append(run, share);
  const lines = el("div", "xwflow-stack xwflow-gap-8");
  for (let index = 0; index < 3; index += 1) lines.append(el("i", "xwflow-branding__line"));
  content.append(flowRow, actions, lines);
  win.append(bar, content);
  return (kit) => {
    win.style.setProperty("--xwflow-brand", parseHex(kit.primary) ? kit.primary : "#ff4fa3");
    win.style.setProperty("--xwflow-brand-ink", bestInk(kit.primary));
    win.dataset.typeface = kit.typefaces.indexOf(kit.typeface).toString();
    name.textContent = kit.productName || words.productName;
    assistant.textContent = fill(words.previewAssistant, { name: kit.assistantName || words.assistantName });
  };
}

function renderContrast(side: HTMLElement, scope: Tracker): (kit: BrandKit) => void {
  const panel = glass(side, { pad: "m", className: "xwflow-stack xwflow-gap-12", label: words.contrast });
  panel.append(el("h2", "xwflow-h3", words.contrast));
  const tableHost = slot(panel, "xwflow-table");
  tableHost.dataset.density = "dense";
  const note = el("p", "xwflow-xs xwflow-sec");
  panel.append(note);
  let owned: Array<{ destroy(): void }> = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  type Row = { key: string; pair: string; ratio: number | null };
  return (kit) => {
    owned.splice(0).forEach((item) => item.destroy());
    tableHost.replaceChildren();
    const rows: Row[] = [
      { key: "a", pair: words.pairs.darkOnPrimary, ratio: contrastRatio("#0a0a0a", kit.primary) },
      { key: "b", pair: words.pairs.primaryOnBackground, ratio: contrastRatio(kit.primary, kit.background) },
      { key: "c", pair: words.pairs.whiteOnPrimary, ratio: contrastRatio("#ffffff", kit.primary) },
    ];
    owned.push(
      new XWUITable(
        tableHost,
        {
          columns: [
            { key: "pair", title: words.columns.pair, render: (_: unknown, row: Row) => el("span", undefined, row.pair) },
            {
              key: "ratio",
              title: words.columns.ratio,
              align: "end",
              render: (_: unknown, row: Row) => el("span", "xwflow-mono", row.ratio === null ? "–" : fill(words.ratio, { n: row.ratio.toFixed(1) })),
            },
            {
              key: "result",
              title: words.columns.result,
              render: (_: unknown, row: Row) => {
                const box = el("div");
                const ok = row.ratio !== null && passesAA(row.ratio);
                owned.push(new XWFlowStatus(box, { tone: row.ratio === null ? "warn" : ok ? "ok" : "err", label: row.ratio === null ? words.invalid : ok ? words.passes : words.fails }));
                return box;
              },
            },
          ],
          data: rows,
        },
        { bordered: false, ariaLabel: words.contrastLabel },
      ),
    );
    note.textContent = fill(words.contrastNote, { ink: bestInk(kit.primary) === "#ffffff" ? words.inkLight : words.inkDark });
  };
}
