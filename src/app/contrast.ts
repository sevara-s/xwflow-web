/** WCAG 2.2 contrast between two sRGB colours written as #rrggbb or #rgb. */

export function parseHex(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, "");
  const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as [number, number, number];
}

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio from 1 to 21, or null when either colour is not a valid hex. */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return null;
  const [light, dark] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** AA needs 4.5 : 1 for body text. */
export function passesAA(ratio: number): boolean {
  return ratio >= 4.5;
}

/** The two text colours a brand colour is checked against: near-black and white. */
export const INK = { dark: "#0a0a0a", light: "#ffffff" } as const;

/** Dark or white text, whichever reads better on the colour. */
export function bestInk(background: string, dark: string = INK.dark, light: string = INK.light): string {
  return (contrastRatio(background, dark) ?? 0) >= (contrastRatio(background, light) ?? 0) ? dark : light;
}
