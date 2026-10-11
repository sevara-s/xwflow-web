/**
 * Components this app adds on top of the published XWUI basic tier (loaded
 * from xwui.dev and never modified). Each extends the published
 * XWUIComponent and keeps XWUI's split: data and config types, a JSON schema,
 * headless logic, a pure view projector, an adapter and its own stylesheet.
 *
 * They are named XWFlow, not XWUI, so no one mistakes them for library
 * components. Pages place them with the kit's `xwflow()` helper.
 */
import { XWFlowLayerStack } from "./layer-stack/XWFlowLayerStack";

export { XWFlowLayerStack };

/** Every XWFlow component by the name pages use. */
export const xwflowComponents = {
  "layer-stack": XWFlowLayerStack,
} as const;

export type XWFlowComponentName = keyof typeof xwflowComponents;
