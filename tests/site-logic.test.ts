import { describe, expect, it } from "vitest";
import { flowAsCode, shortName, thumbStyle } from "../src/components/XWFlowNotationThumb/XWFlowNotationThumb.logic";
import { clampTilt, clampZoom, nodeDepth } from "../src/components/XWFlowScene3D/XWFlowScene3D.logic";

describe("notation thumbnails", () => {
  it("maps notations to a drawing style, falling back to the node graph", () => {
    expect(thumbStyle("bpmn")).toBe("bpmn");
    expect(thumbStyle("bpmn1")).toBe("bpmn");
    expect(thumbStyle("uml-sequence")).toBe("sequence");
    expect(thumbStyle("petri")).toBe("petri");
    expect(thumbStyle("something-new")).toBe("graph");
  });

  it("shortens long step names with an ellipsis", () => {
    expect(shortName("Over 500?")).toBe("Over 500?");
    expect(shortName("Look up customer", 10)).toBe("Look up c…");
  });

  it("writes the flow as Mermaid edges, one per line", () => {
    expect(flowAsCode(["New order", "Look up customer", "Over 500?"])).toEqual([
      "flowchart LR",
      "  A[New order] --> B[Look up customer]",
      "  B[Look up customer] --> C[Over 500?]",
    ]);
  });
});

describe("3D scene", () => {
  it("raises later steps higher so depth reads as order", () => {
    expect(nodeDepth(0, 5)).toBe(40);
    expect(nodeDepth(4, 5)).toBe(110);
    expect(nodeDepth(0, 1)).toBe(60);
  });

  it("keeps orbit and zoom inside readable limits", () => {
    expect(clampTilt({ x: 5, z: -200 })).toEqual({ x: 20, z: -80 });
    expect(clampTilt({ x: 54, z: -26 })).toEqual({ x: 54, z: -26 });
    expect(clampZoom(3)).toBe(1.6);
    expect(clampZoom(0.1)).toBe(0.6);
  });
});
