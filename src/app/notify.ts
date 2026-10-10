import { catalog } from "../content/catalog";
import { XWUIToast } from "../xwui";

type Toaster = Pick<XWUIToast, "show">;
let toaster: Toaster | null = null;

/** Use the toaster a composed shell mounted (any XWUI toast with show()), or mount one into a legacy host. */
export function mountToaster(target: HTMLElement | Toaster): void {
  toaster = target instanceof HTMLElement ? new XWUIToast(target) : target;
}

export function notify(message: string, variant: "success" | "warning" | "danger" | "info" = "info"): void {
  toaster?.show({ message, variant });
}

export function errorMessage(error: unknown, fallback: string = catalog.errors.save): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
