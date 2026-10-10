import { describe, expect, it } from "vitest";
import { bestInk, contrastRatio, parseHex, passesAA } from "../src/app/contrast";

describe("contrast", () => {
  it("parses short and long hex colours and rejects anything else", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("ff4fa3")).toEqual([255, 79, 163]);
    expect(parseHex("#ggg")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
  });

  it("computes the WCAG ratio in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(contrastRatio("#zzz", "#000")).toBeNull();
  });

  it("checks the prototype's pink brand colour", () => {
    const onDark = contrastRatio("#0a0a0a", "#ff4fa3") ?? 0;
    const white = contrastRatio("#ffffff", "#ff4fa3") ?? 0;
    expect(onDark).toBeGreaterThan(6);
    expect(passesAA(onDark)).toBe(true);
    expect(white).toBeCloseTo(3.0, 0);
    expect(passesAA(white)).toBe(false);
  });

  it("picks the more readable ink", () => {
    expect(bestInk("#ff4fa3")).toBe("#0a0a0a");
    expect(bestInk("#1a1a40")).toBe("#ffffff");
  });
});
