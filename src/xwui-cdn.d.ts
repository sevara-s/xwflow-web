declare module "https://xwui.dev/esm/basic.bundle.js" {
  export class XWUIComponent {
    constructor(container: HTMLElement, data?: object, config?: object);
    get container(): HTMLElement;
    destroy(): void;
    setData(data: object): void;
    updateData(data: object): void;
    static configure(config: object): void;
    static componentName: string;
  }

  export class XWUIButton extends XWUIComponent {
    onClick(handler: (event: MouseEvent) => void): void;
  }

  export class XWUIInputText extends XWUIComponent {
    getValue(): string;
    onChange(handler: (value: string, event: Event) => void): void;
  }

  export class XWUIInputTextarea extends XWUIComponent {
    getValue(): string;
    onChange(handler: (value: string, event: Event) => void): void;
  }

  export class XWUISelect extends XWUIComponent {
    getValue(): string | string[] | undefined;
    onChange(handler: (value: string | string[], event: Event) => void): void;
  }

  export class XWUIDialog extends XWUIComponent {
    open(): void;
    close(): void;
  }

  export class XWUIToast extends XWUIComponent {
    show(options: { message: string; variant?: string }): void;
  }

  export class XWUITabs extends XWUIComponent {
    onChange(handler: (tabId: string, event: Event) => void): void;
    setActiveTab(tabId: string): void;
  }

  export class XWUIShell extends XWUIComponent {}
  export class XWUINavSidebar extends XWUIComponent {}
  export class XWUIDataTable extends XWUIComponent {}
  export class XWUITimeline extends XWUIComponent {}
  export class XWUIPageHeader extends XWUIComponent {}
  export class XWUIStatGroup extends XWUIComponent {}
  export class XWUIEmpty extends XWUIComponent {}
  export class XWUICard extends XWUIComponent {}
  export class XWUIDisplayChip extends XWUIComponent {
    onClick(handler: (event: Event) => void): void;
  }
  export class XWUIDisplayLockBanner extends XWUIComponent {}
  export class XWUIIcon extends XWUIComponent {}
  export class XWUIPipelineStages extends XWUIComponent {}
  export class XWUISteps extends XWUIComponent {}
  export class XWUIBreadcrumbs extends XWUIComponent {}
  export class XWUIAlert extends XWUIComponent {}
  export class XWUIProgressSpinner extends XWUIComponent {}
  export class XWUITypography extends XWUIComponent {}
  export class XWUIDisplayStatusPill extends XWUIComponent {}
}
