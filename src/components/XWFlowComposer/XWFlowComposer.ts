import {
  XWUIButton,
  XWUICard,
  XWUIComponent,
  XWUIDisplayChip,
  XWUIDisplayLockBanner,
  XWUIDisplayStatusPill,
  XWUIIcon,
  XWUIInputTextarea,
  XWUITypography,
} from "../../xwui";
import "./XWFlowComposer.css";
import { draftModel, openingSample, sampleById, sampleForPrompt } from "./XWFlowComposer.logic";
import type { ComposerSample, ComposerStep, XWFlowComposerData } from "./XWFlowComposer.types";
import { renderComposer, type ComposerSlots } from "./XWFlowComposer.view";

const revealDelay = 280;

const display = {
  variant: "h2",
  weight: "bold",
  fontSize: "clamp(42px, 4.5vw, 60px)",
  letterSpacing: "-0.048em",
  lineHeight: "0.96",
} as const;

export class XWFlowComposer extends XWUIComponent {
  static componentName = "XWFlowComposer";

  private composerData!: XWFlowComposerData;
  private slots: ComposerSlots | null = null;
  private prompt: XWUIInputTextarea | null = null;
  private owned: Array<{ destroy(): void }> = [];
  private draftOwned: Array<{ destroy(): void }> = [];
  private abort = new AbortController();
  private sample!: ComposerSample;
  private shown = 0;
  private token = 0;
  private timer = 0;

  constructor(container: HTMLElement, data: XWFlowComposerData) {
    super(container, data);
    this.composerData = data;
    this.sample = openingSample(data);
    this.shown = this.sample.steps.length;
    this.paint();
  }

  private paint(): void {
    this.clearOwned();
    this.abort.abort();
    this.abort = new AbortController();
    const slots = renderComposer(this.container, this.composerData);
    this.slots = slots;
    const opening = this.sample.prompt;
    this.prompt = new XWUIInputTextarea(
      slots.prompt,
      { label: this.composerData.promptLabel, value: opening, rows: 2 },
      { variant: "outlined", fullWidth: true, resize: "none" },
    );
    const build = new XWUIButton(
      slots.build,
      { text: `${this.composerData.buildLabel} ${this.composerData.buildArrow}` },
      { shape: "pill", type: "button" },
    );
    build.onClick((event) => {
      event.preventDefault();
      this.build();
    });
    const scope = new XWUIDisplayChip(
      slots.scope,
      { label: this.composerData.scopeLabel },
      { size: "sm", type: "assist" },
    );
    this.owned.push(
      new XWUITypography(slots.title, { text: this.composerData.title }, { ...display, component: "span" }),
      new XWUITypography(
        slots.accent,
        { text: this.composerData.accent },
        {
          ...display,
          component: "span",
          color: "gradient",
          gradient: "linear-gradient(90deg, #3ec8ff 0%, #7aa6ff 24%, #c86bff 58%, #ff5cbf 100%)",
          className: "xwflow-composer__accent",
        },
      ),
      new XWUITypography(
        slots.close,
        { text: this.composerData.close },
        { ...display, component: "span", textColor: "#ff7436", className: "xwflow-composer__close" },
      ),
      new XWUITypography(
        slots.lede,
        { text: this.composerData.lede },
        { variant: "body", component: "p", className: "xwflow-composer__lede" },
      ),
      this.prompt,
      scope,
      build,
    );
    this.composerData.suggestions.forEach((item, index) => {
      const node = slots.suggestions[index];
      if (!node) return;
      const chip = new XWUIDisplayChip(
        node,
        { label: item.label },
        { clickable: true, type: "suggestion", size: "sm" },
      );
      chip.onClick(() => this.useSuggestion(item.id));
      this.owned.push(chip);
    });
    slots.prompt.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          this.build();
        }
      },
      { signal: this.abort.signal },
    );
    this.renderDraft();
  }

  private build(): void {
    this.play(sampleForPrompt(this.composerData, this.prompt?.getValue() ?? ""));
  }

  private useSuggestion(id: string): void {
    const sample = sampleById(this.composerData, id);
    this.prompt?.setData({
      label: this.composerData.promptLabel,
      value: sample.prompt,
      rows: 2,
    });
    this.play(sample);
  }

  private play(sample: ComposerSample): void {
    const token = ++this.token;
    window.clearTimeout(this.timer);
    this.sample = sample;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      this.shown = sample.steps.length;
      this.renderDraft();
      return;
    }
    this.shown = 0;
    this.renderDraft();
    const step = () => {
      if (token !== this.token) return;
      if (this.shown >= sample.steps.length) return;
      this.shown += 1;
      this.renderDraft();
      if (this.shown < sample.steps.length) this.timer = window.setTimeout(step, revealDelay);
    };
    this.timer = window.setTimeout(step, revealDelay);
  }

  private renderDraft(): void {
    if (!this.slots) return;
    this.clearDraft();
    const model = draftModel(this.composerData, this.sample, this.shown);
    const header = document.createElement("div");
    header.className = "xwflow-composer__head";
    const label = document.createElement("div");
    const streaming = document.createElement("div");
    const count = document.createElement("div");
    count.className = "xwflow-composer__count";
    header.append(label, streaming, count);
    const body = document.createElement("ol");
    body.className = "xwflow-composer__steps";
    this.draftOwned.push(
      new XWUITypography(label, { text: model.label }, { variant: "body", weight: "semibold", component: "span" }),
      new XWUIDisplayStatusPill(
        streaming,
        { label: model.streamingLabel, variant: "info" },
        { dot: false, pulse: true, size: "sm" },
      ),
      new XWUITypography(count, { text: model.countLabel }, { variant: "caption", component: "span" }),
    );
    model.steps.forEach((step, index) => {
      body.append(this.renderStep(step, index >= model.steps.length - 2 && model.steps.length > 2));
    });
    const footer = document.createElement("div");
    if (model.showNotice) {
      this.draftOwned.push(
        new XWUIDisplayLockBanner(
          footer,
          { variant: "custom", title: model.notice, message: "" },
          { style: "inline", showIcon: true, className: "xwflow-composer__notice" },
        ),
      );
    }
    this.draftOwned.push(
      new XWUICard(
        this.slots.draft,
        { header, body, footer: model.showNotice ? footer : undefined },
        { variant: "filled", padding: "small", className: "xwflow-composer__card" },
      ),
    );
  }

  private renderStep(step: ComposerStep, wash: boolean): HTMLLIElement {
    const item = document.createElement("li");
    item.className = wash ? "xwflow-composer__step is-wash" : "xwflow-composer__step";
    const glyph = document.createElement("div");
    glyph.className = `xwflow-composer__glyph is-${step.tone}`;
    const copy = document.createElement("div");
    copy.className = "xwflow-composer__step-copy";
    const title = document.createElement("div");
    const detail = document.createElement("div");
    const mark = document.createElement("div");
    mark.className = "xwflow-composer__mark";
    copy.append(title, detail);
    item.append(glyph, copy, mark);
    this.draftOwned.push(
      new XWUIIcon(glyph, { name: step.icon }, { size: "sm", decorative: true, lazy: false }),
      new XWUITypography(title, { text: step.title }, { variant: "body", weight: "semibold", component: "span" }),
      new XWUITypography(
        detail,
        { text: step.detail },
        step.markIcon
          ? { variant: "caption", component: "span", className: "is-alert" }
          : { variant: "caption", component: "span" },
      ),
      this.markFor(mark, step),
    );
    return item;
  }

  private markFor(host: HTMLElement, step: ComposerStep): { destroy(): void } {
    if (step.markIcon) return new XWUIIcon(host, { name: step.markIcon }, { size: "sm", decorative: true, lazy: false });
    if (step.markLabel) {
      return new XWUIDisplayChip(host, { label: step.markLabel }, { size: "sm", type: "assist" });
    }
    return new XWUIDisplayStatusPill(host, { label: "", variant: "success" }, { dot: true, size: "sm" });
  }

  private clearDraft(): void {
    for (const item of this.draftOwned.splice(0)) item.destroy();
    this.slots?.draft.replaceChildren();
  }

  private clearOwned(): void {
    window.clearTimeout(this.timer);
    this.clearDraft();
    for (const item of this.owned.splice(0)) item.destroy();
    this.prompt = null;
  }

  override destroy(): void {
    this.token += 1;
    this.abort.abort();
    this.clearOwned();
    super.destroy();
  }
}
