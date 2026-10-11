/**
 * The decorative glows of every page (halos, orbs, rings and cubes): what,
 * which hue, how large and where, as the prototype places them. Pages name a
 * decoration and never carry its geometry; the positions live here only.
 */
import type { Hue } from "./kit";

export interface Decoration {
  kind: "orb" | "ring" | "cube" | "halo";
  hue: Hue;
  /** Diameter or edge, in pixels. */
  size: number;
  /** Offsets from the decorated box's edges, as CSS lengths. */
  place: Partial<Record<"top" | "right" | "bottom" | "left", string>>;
  /** Ring stroke, in pixels. */
  thickness?: number;
}

export const decorations = {
  "branding.halo": { kind: "halo", hue: "pink", size: 320, place: { left: "25%", top: "60px" } },
  "denied.ring": { kind: "ring", hue: "pink", size: 180, place: { left: "0", top: "0" }, thickness: 5 },
  "denied.orb": { kind: "orb", hue: "pink", size: 110, place: { left: "35px", top: "35px" } },
  "denied.halo": { kind: "halo", hue: "violet", size: 420, place: { left: "10%", top: "-40px" } },
  "denied.halo2": { kind: "halo", hue: "pink", size: 360, place: { right: "8%", top: "120px" } },
  "health.halo": { kind: "halo", hue: "lime", size: 200, place: { left: "-55px", top: "-55px" } },
  "health.orb": { kind: "orb", hue: "lime", size: 90, place: { left: "0", top: "0" } },
  "integrations.halo": { kind: "halo", hue: "violet", size: 520, place: { left: "32%", top: "-120px" } },
  "integrations.cube": { kind: "cube", hue: "lime", size: 64, place: { left: "12%", top: "80px" } },
  "integrations.cube2": { kind: "cube", hue: "pink", size: 44, place: { right: "14%", top: "200px" } },
  "integrations.orb": { kind: "orb", hue: "cyan", size: 70, place: { right: "9%", top: "40px" } },
  "landing.halo": { kind: "halo", hue: "violet", size: 520, place: { left: "-120px", top: "-60px" } },
  "landing.halo2": { kind: "halo", hue: "cyan", size: 460, place: { right: "-80px", top: "60px" } },
  "landing.cube": { kind: "cube", hue: "cyan", size: 70, place: { left: "9%", top: "60px" } },
  "landing.orb": { kind: "orb", hue: "lime", size: 90, place: { right: "11%", top: "40px" } },
  "landing.orb2": { kind: "orb", hue: "pink", size: 54, place: { left: "18%", bottom: "120px" } },
  "landing.halo3": { kind: "halo", hue: "violet", size: 360, place: { left: "10%", top: "10%" } },
  "landing.halo4": { kind: "halo", hue: "pink", size: 420, place: { right: "-80px", bottom: "-160px" } },
  "landing.ring": { kind: "ring", hue: "violet", size: 260, place: { right: "6%", top: "-40px" }, thickness: 10 },
  "landing.orb3": { kind: "orb", hue: "lime", size: 70, place: { right: "18%", bottom: "40px" } },
  "notations.halo": { kind: "halo", hue: "violet", size: 520, place: { left: "-60px", top: "-80px" } },
  "notations.halo2": { kind: "halo", hue: "pink", size: 460, place: { right: "-60px", top: "120px" } },
  "pricing.halo": { kind: "halo", hue: "violet", size: 240, place: { right: "-80px", top: "-80px" } },
  "pricing.cube": { kind: "cube", hue: "violet", size: 60, place: { right: "8%", top: "30px" } },
  "pricing.ring": { kind: "ring", hue: "violet", size: 220, place: { left: "8%", top: "40px" }, thickness: 8 },
  "pricing.orb": { kind: "orb", hue: "pink", size: 80, place: { right: "12%", top: "60px" } },
  "pricing.orb2": { kind: "orb", hue: "cyan", size: 46, place: { right: "24%", top: "220px" } },
  "self-host.orb": { kind: "orb", hue: "lime", size: 46, place: { right: "16%", top: "20px" } },
  "self-host.halo": { kind: "halo", hue: "violet", size: 520, place: { left: "-80px", top: "-60px" } },
  "assistant.ring": { kind: "ring", hue: "violet", size: 200, place: { left: "0", top: "0" }, thickness: 4 },
  "assistant.ring2": { kind: "ring", hue: "violet", size: 170, place: { left: "15px", top: "15px" }, thickness: 3 },
  "assistant.orb": { kind: "orb", hue: "violet", size: 120, place: { left: "40px", top: "40px" } },
  "assistant.halo": { kind: "halo", hue: "violet", size: 460, place: { left: "30%", top: "60px" } },
  "assistant.halo2": { kind: "halo", hue: "cyan", size: 300, place: { right: "6%", top: "-40px" } },
  "connections.orb": { kind: "orb", hue: "lime", size: 96, place: { left: "0", top: "0" } },
  "flows.halo": { kind: "halo", hue: "violet", size: 260, place: { right: "-40px", top: "-120px" } },
  "flows.cube": { kind: "cube", hue: "lime", size: 56, place: { right: "250px", top: "26px" } },
  "overview.halo": { kind: "halo", hue: "violet", size: 380, place: { right: "-80px", top: "-140px" } },
  "overview.halo2": { kind: "halo", hue: "lime", size: 240, place: { left: "-60px", bottom: "-120px" } },
  "overview.orb": { kind: "orb", hue: "violet", size: 72, place: { right: "48px", top: "36px" } },
  "run.halo": { kind: "halo", hue: "lime", size: 260, place: { left: "-40px", top: "-60px" } },
  "templates.ring": { kind: "ring", hue: "violet", size: 160, place: { right: "2%", top: "-70px" }, thickness: 3 },
  "templates.cube": { kind: "cube", hue: "lime", size: 64, place: { right: "14%", top: "-24px" } },
  "view.halo": { kind: "halo", hue: "violet", size: 420, place: { left: "30%", top: "30%" } },
} satisfies Record<string, Decoration>;

export type DecorationName = keyof typeof decorations;
