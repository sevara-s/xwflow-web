import { catalog } from "../content/catalog";
import type { XWUIToast } from "../xwui";

type Toaster = Pick<XWUIToast, "show">;
let toaster: Toaster | null = null;

/** Use the toaster the app's composer mounted (any XWUI toast with show()). */
export function mountToaster(target: Toaster): void {
  toaster = target;
}

export function notify(message: string, variant: "success" | "warning" | "danger" | "info" = "info"): void {
  toaster?.show({ message, variant });
}

export function errorMessage(error: unknown, fallback: string = catalog.errors.save): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
