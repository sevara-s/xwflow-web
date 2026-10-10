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
  export class XWUIInputSlider extends XWUIComponent {
    getValue(): number;
    setValue(value: number): void;
    onChange(handler: (value: number) => void): void;
  }
  export class XWUIUptimeBar extends XWUIComponent {}
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

  /** One XWUI component in a composed tree (XWUIComposer). */
  export interface XWUIComposerNode {
    tag: string;
    data?: Record<string, unknown>;
    config?: Record<string, unknown>;
    slots?: Record<string, XWUIComposerNode | XWUIComposerNode[] | string>;
    on?: Record<string, (event: Event, instance: unknown) => void>;
    ref?: (instance: unknown, element: HTMLElement) => void;
    key?: string;
  }
  export class XWUIComposer extends XWUIComponent {
    static element(node: XWUIComposerNode): HTMLElement | null;
    setTree(tree: XWUIComposerNode | XWUIComposerNode[]): void;
    getElementByKey(key: string): HTMLElement | undefined;
    getInstanceByKey<T = unknown>(key: string): T | undefined;
  }
  export class XWUIFlowCanvas extends XWUIComponent {
    fit(): void;
    zoom(factor: number): void;
    tidy(): void;
    select(id: string): void;
    setData(data: object): void;
    on(event: "select" | "move" | "tidy", handler: (detail: never) => void): () => void;
  }
  export class XWUIFlowScene extends XWUIComponent {
    zoom(factor: number): void;
    reset(): void;
    setData(data: object): void;
  }
  export class XWUIStatusGlyph extends XWUIComponent {
    setTone(tone: string, label?: string): void;
  }
}
