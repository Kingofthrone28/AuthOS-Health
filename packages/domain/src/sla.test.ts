import { calculateDueAt, isBreached, hoursRemaining, isNearingBreach } from "./sla.js";

const HOUR = 1000 * 60 * 60;

describe("sla", () => {
  const base = new Date("2026-01-01T00:00:00Z");

  describe("calculateDueAt", () => {
    it("sets due date 24h out for urgent", () => {
      const due = calculateDueAt("urgent", base);
      expect(due.getTime()).toBe(base.getTime() + 24 * HOUR);
    });

    it("sets due date 72h out for expedited", () => {
      const due = calculateDueAt("expedited", base);
      expect(due.getTime()).toBe(base.getTime() + 72 * HOUR);
    });

    it("sets due date 168h out for standard", () => {
      const due = calculateDueAt("standard", base);
      expect(due.getTime()).toBe(base.getTime() + 168 * HOUR);
    });
  });

  describe("isBreached", () => {
    it("returns true when now is past dueAt", () => {
      const dueAt = new Date(base.getTime() - HOUR);
      expect(isBreached(dueAt, base)).toBe(true);
    });

    it("returns false when now is before dueAt", () => {
      const dueAt = new Date(base.getTime() + HOUR);
      expect(isBreached(dueAt, base)).toBe(false);
    });
  });

  describe("isNearingBreach", () => {
    it("returns true when within threshold", () => {
      const dueAt = new Date(base.getTime() + 2 * HOUR);
      expect(isNearingBreach(dueAt, 4, base)).toBe(true);
    });

    it("returns false when outside threshold", () => {
      const dueAt = new Date(base.getTime() + 10 * HOUR);
      expect(isNearingBreach(dueAt, 4, base)).toBe(false);
    });

    it("returns false when already breached", () => {
      const dueAt = new Date(base.getTime() - HOUR);
      expect(isNearingBreach(dueAt, 4, base)).toBe(false);
    });
  });
});
