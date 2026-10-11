import { describe, expect, it } from "vitest";
import { formatIn } from "../src/app/format";

describe("formatIn", () => {
  const now = Date.UTC(2026, 9, 11, 12, 0, 0);
  it("reads minutes within the hour, hours within the day, then days", () => {
    expect(formatIn(now + 23 * 60_000, now)).toBe("in 23 minutes");
    expect(formatIn(now + 5 * 3_600_000, now)).toBe("in 5 hours");
    expect(formatIn(now + 6 * 86_400_000, now)).toBe("in 6 days");
  });
});
