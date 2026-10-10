/**
 * Types for the XWUI basic tier loaded from the CDN. XWUI ships no package on
 * npm yet, so these declarations cover the surface this app uses. Shapes
 * follow the published schemas at https://xwui.dev/schemas/v1/.
 */
declare module "https://xwui.dev/esm/basic.bundle.js" {
  type Data = object;
  type Conf = object;

  export class XWUIComponent<D extends Data = Record<string, unknown>, C extends Conf = Record<string, unknown>> {
    constructor(container: HTMLElement, data?: D, conf?: C);
    static componentName: string;
    get container(): HTMLElement;
    get data(): D;
    get config(): C;
    setData(data: D): void;
    updateData(partial: Partial<D>): void;
    destroy(): void;
  }

  export class XWUIButton extends XWUIComponent {
    onClick(handler: (event: MouseEvent) => void): void;
    updateConfig(config: object): void;
    setLoading(loading: boolean): void;
    setDisabled(disabled: boolean): void;
    setPressed(pressed: boolean): void;
    setText(text: string): void;
  }
  export class XWUIInputText extends XWUIComponent {
    getValue(): string;
    setValue(value: string): void;
    onChange(handler: (value: string, event: Event) => void): void;
    focus(): void;
  }
  export class XWUIInputTextarea extends XWUIComponent {
    getValue(): string;
    setValue(value: string): void;
    onChange(handler: (value: string, event: Event) => void): void;
    focus(): void;
  }
  export class XWUISelect extends XWUIComponent {
    getValue(): string | string[] | undefined;
    setValue(value: string): void;
    onChange(handler: (value: string | string[], event: Event) => void): void;
  }
  export class XWUIInputSwitch extends XWUIComponent {
    onChange(handler: (checked: boolean, event: Event) => void): void;
  }
  export class XWUIInputCheckbox extends XWUIComponent {
    onChange(handler: (checked: boolean, event: Event) => void): void;
  }
  export class XWUINavTabs extends XWUIComponent {
    onChange(handler: (tabId: string, event: Event) => void): void;
    setActiveTab(tabId: string): void;
  }
  export class XWUITable extends XWUIComponent {
    /** Receives the indexes of the selected rows. */
    onSelect(handler: (rows: number[]) => void): void;
    setSelectedRows(rows: number[]): void;
    deselectAll(): void;
    /** Fires for clicks on rows when `rowClickable` is set. */
    onRowClick<R = Record<string, unknown>>(handler: (record: R, index: number, event: Event) => void): void;
  }
  export class XWUIDisplayChip extends XWUIComponent {
    onClick(handler: (event: Event) => void): void;
    onClose(handler: (event: Event) => void): void;
  }
  export class XWUIMenuDropdown extends XWUIComponent {
    onItemClick(handler: (item: { id: string }, event: Event) => void): void;
    open?(): void;
  }
  export class XWUIDialog extends XWUIComponent {
    open(): void;
    close(): void;
  }
  export class XWUIToast extends XWUIComponent {
    show(options: { message: string; variant?: string; title?: string }): void;
  }

  export class XWUIAlert extends XWUIComponent {}
  export class XWUISegmentedControl extends XWUIComponent {
    onChange?(handler: (value: string) => void): void;
  }
  export class XWUIButtonCopy extends XWUIComponent {}
  export class XWUIAvatar extends XWUIComponent {}
  export class XWUIBarSiteFooter extends XWUIComponent {}
  export class XWUIBarSiteHeader extends XWUIComponent {}
  export class XWUIBreadcrumbs extends XWUIComponent {}
  export class XWUICodeBlock extends XWUIComponent {}
  export class XWUIDisplayStatistic extends XWUIComponent {}
  export class XWUIEmpty extends XWUIComponent {}
  export class XWUIIcon extends XWUIComponent {}
  export class XWUIKbd extends XWUIComponent {}
  export class XWUIProgressBar extends XWUIComponent {}
  export class XWUIProgressSpinner extends XWUIComponent {}
  export class XWUITag extends XWUIComponent {}
  export class XWUITypography extends XWUIComponent {}
}
