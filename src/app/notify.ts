import { catalog } from "../content/catalog";
import { XWUIToast } from "../xwui";

let toaster: XWUIToast | null = null;

export function mountToaster(host: HTMLElement): void {
  toaster = new XWUIToast(host);
}

export function notify(message: string, variant: "success" | "warning" | "danger" | "info" = "info"): void {
  toaster?.show({ message, variant });
}

export function errorMessage(error: unknown, fallback = catalog.errors.save): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
