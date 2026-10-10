/** Share of the ring to fill, 0 to 100. */
export function gaugePercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, value / total)) * 100);
}
