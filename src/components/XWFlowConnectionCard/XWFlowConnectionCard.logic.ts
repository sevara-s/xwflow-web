import type { StatusTone } from "../../types/domain";

/** Cards that need attention get a coloured edge: red when broken, amber when expiring. */
export function cardSeverity(tone: StatusTone): "bad" | "warn" | "ok" {
  if (tone === "err") return "bad";
  if (tone === "warn") return "warn";
  return "ok";
}

/** Split text around the first occurrence of `emphasis`, for bold rendering. */
export function splitEmphasis(text: string, emphasis?: string): [string, string, string] {
  if (!emphasis) return [text, "", ""];
  const at = text.indexOf(emphasis);
  if (at === -1) return [text, "", ""];
  return [text.slice(0, at), emphasis, text.slice(at + emphasis.length)];
}
