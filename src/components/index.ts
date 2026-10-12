/**
 * Components this app adds on top of the published XWUI basic tier (loaded
 * from xwui.dev and never modified). Each extends the published
 * XWUIComponent and keeps XWUI's split: data and config types, a JSON schema,
 * headless logic, a pure view projector, an adapter and its own stylesheet.
 *
 * They are named XWFlow, not XWUI, so no one mistakes them for library
 * components. Each is also a custom element (`<xwflow-layer-stack>`,
 * `<xwflow-notation-diagram>`), registered the way XWUI registers its own,
 * so plain HTML can use it. Pages place them with the kit's `xwflow()`
 * helper, because the published XWUIComposer only mounts xwui- tags.
 */
import { createXWUIElement } from "../xwui";
import { XWFlowLayerStack } from "./layer-stack/XWFlowLayerStack";
import { XWFlowNotationDiagram } from "./notation-diagram/XWFlowNotationDiagram";

export { XWFlowLayerStack, XWFlowNotationDiagram };

/** Every XWFlow component by the name pages use. */
export const xwflowComponents = {
  "layer-stack": XWFlowLayerStack,
  "notation-diagram": XWFlowNotationDiagram,
} as const;

export type XWFlowComponentName = keyof typeof xwflowComponents;

createXWUIElement(XWFlowLayerStack, "xwflow-layer-stack", {
  flatAttrsToConfig: ["tiltX", "tiltZ", "spacing", "width", "height", "viewHeight", "className"],
  flatAttrsToData: ["layers", "panels", "label"],
});

createXWUIElement(XWFlowNotationDiagram, "xwflow-notation-diagram", {
  flatAttrsToConfig: ["mode", "className"],
  flatAttrsToData: ["title", "steps", "edges", "lanes", "external", "messages", "actor", "selectedMessage", "labels"],
});
