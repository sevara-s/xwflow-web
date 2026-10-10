import type { HealthState } from "../../types/domain";

export interface IsoTile {
  id: string;
  label: string;
  state: HealthState | "info" | "violet";
  /** Position on the plane, in pixels before the tilt. */
  x: number;
  y: number;
  /** How far the tile lifts off the plane. */
  lift?: number;
}

export interface XWFlowIsoTilesData {
  tiles: IsoTile[];
  /** Spoken summary of the drawing. */
  label: string;
}

export interface XWFlowIsoTilesConfig {
  /** `tile` for big squares (reachability), `hub` for small nodes (topology). */
  variant?: "tile" | "hub";
  width?: number;
  height?: number;
  tilt?: { x: number; z: number };
  /** Draw the glowing grid floor under the tiles. */
  floor?: boolean;
  /** Wires from the first tile to every other tile. */
  links?: boolean;
  className?: string;
}
