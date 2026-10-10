/** Each step floats at its own height, rising along the flow so depth reads as order. */
export function nodeDepth(index: number, total: number): number {
  if (total <= 1) return 60;
  return Math.round(40 + (index / (total - 1)) * 70);
}

/** Keep orbiting inside angles where the floor still reads as a floor. */
export function clampTilt(tilt: { x: number; z: number }): { x: number; z: number } {
  return { x: Math.min(70, Math.max(20, tilt.x)), z: Math.max(-80, Math.min(80, tilt.z)) };
}

export function clampZoom(zoom: number): number {
  return Math.min(1.6, Math.max(0.6, zoom));
}
