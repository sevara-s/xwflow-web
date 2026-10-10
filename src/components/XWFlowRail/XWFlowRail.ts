import { XWUIButton, XWUIComponent, XWUIIcon, XWUIInputText, XWUIKbd, XWUIProgressBar, XWUITag } from "../../xwui";
import { XWFlowBrand } from "../XWFlowBrand/XWFlowBrand";
import { registerStyles } from "../registerStyles";
import css from "./XWFlowRail.css?inline";
import { isSearchShortcut, usagePercent } from "./XWFlowRail.logic";
import type { XWFlowRailConfig, XWFlowRailData, XWFlowRailEvents } from "./XWFlowRail.types";
import { renderRail } from "./XWFlowRail.view";

registerStyles("XWFlowRail", css);

type Owned = { destroy(): void };

/**
 * The Studio side rail: brand, global search (Ctrl K), Create, the project
 * and chat lists, footer links and the run-usage meter. Items are links, so
 * navigation, middle-click and screen readers behave as on any page.
 */
export class XWFlowRail extends XWUIComponent<XWFlowRailData, XWFlowRailConfig> {
  static componentName = "XWFlowRail";

  private owned: Owned[] = [];
  private collapsed: boolean;
  private searchInput: XWUIInputText | null = null;
  private handlers: Partial<XWFlowRailEvents> = {};
  private readonly onKey = (event: KeyboardEvent): void => {
    if (!isSearchShortcut(event) || !this.searchInput) return;
    event.preventDefault();
    if (this.collapsed) this.setCollapsed(false);
    this.searchInput.focus();
  };

  constructor(container: HTMLElement, data: XWFlowRailData, config: XWFlowRailConfig = {}) {
    super(container, data, config);
    this.collapsed = Boolean(config.collapsed);
    this.render();
    document.addEventListener("keydown", this.onKey);
  }

  on<K extends keyof XWFlowRailEvents>(event: K, handler: XWFlowRailEvents[K]): void {
    this.handlers[event] = handler;
  }

  /** Move the current-page marker without rebuilding the rail. */
  select(id: string): void {
    this.data.selected = id;
    for (const link of this.container.querySelectorAll<HTMLAnchorElement>(".xwflow-rail__item")) {
      const item = [...this.data.sections.flatMap((section) => section.items), ...this.data.footer].find(
        (entry) => entry.href === link.getAttribute("href"),
      );
      if (item?.id === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.render();
    this.handlers.toggle?.(collapsed);
  }

  override setData(data: XWFlowRailData): void {
    super.setData(data);
    this.render();
  }

  private render(): void {
    this.release();
    const data = this.data;
    const config: XWFlowRailConfig = { ...this.config, collapsed: this.collapsed };
    const slots = renderRail(this.container, data, config);

    this.owned.push(new XWFlowBrand(slots.brand, data.brand, { size: "sm" }));

    const collapse = new XWUIButton(
      slots.collapse,
      { text: "" },
      {
        variant: "ghost",
        size: "sm",
        icon: "panel-left",
        ariaLabel: config.collapsed ? data.labels.expand : data.labels.collapse,
        title: config.collapsed ? data.labels.expand : data.labels.collapse,
      },
    );
    collapse.onClick(() => this.setCollapsed(!this.collapsed));
    this.owned.push(collapse);

    const keys = document.createElement("span");
    this.owned.push(new XWUIKbd(keys, { keys: data.labels.searchKeys }, { size: "sm" }));
    this.searchInput = new XWUIInputText(
      slots.search,
      { placeholder: data.labels.search },
      { type: "search", leadingIcon: "search", ariaLabel: data.labels.searchAria, suffix: keys, fullWidth: true },
    );
    this.searchInput.onChange((value) => this.handlers.search?.(value));
    this.owned.push(this.searchInput);

    const create = new XWUIButton(slots.create, { text: data.labels.create }, { variant: "primary", icon: "plus", fullWidth: true });
    create.onClick(() => this.handlers.create?.(slots.create));
    this.owned.push(create);

    for (const { host, name } of slots.icons) {
      this.owned.push(new XWUIIcon(host, { name }, { size: "sm", decorative: true }));
    }
    for (const { host, badge } of slots.badges) {
      this.owned.push(new XWUITag(host, { label: badge.label }, { variant: badge.tone === "lime" ? "primary" : "warning", size: "small" }));
    }
    if (slots.usageBar && data.usage) {
      this.owned.push(
        new XWUIProgressBar(
          slots.usageBar,
          { value: usagePercent(data.usage.ratio) },
          { size: "sm", block: true, className: "xwflow-rail__progress" },
        ),
      );
    }
  }

  private release(): void {
    for (const item of this.owned.splice(0)) item.destroy();
    this.searchInput = null;
  }

  override destroy(): void {
    document.removeEventListener("keydown", this.onKey);
    this.release();
    super.destroy();
  }
}
