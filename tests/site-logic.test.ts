import { describe, expect, it } from "vitest";
import { clampTilt, clampZoom, nodeDepth } from "../src/components/XWFlowScene3D/XWFlowScene3D.logic";

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
