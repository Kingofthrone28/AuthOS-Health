import { assertValidTransition, isValidTransition, allowedTransitions, InvalidTransitionError } from "./stateMachine.js";

describe("stateMachine", () => {
  it("allows valid transitions", () => {
    expect(isValidTransition("new", "requirements_found")).toBe(true);
    expect(isValidTransition("submitted", "pending_payer")).toBe(true);
    expect(isValidTransition("denied", "appealed")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(isValidTransition("approved", "submitted")).toBe(false);
    expect(isValidTransition("closed", "new")).toBe(false);
    expect(isValidTransition("new", "approved")).toBe(false);
  });

  it("throws InvalidTransitionError on assertValidTransition for invalid path", () => {
    expect(() => assertValidTransition("approved", "submitted")).toThrow(InvalidTransitionError);
  });

  it("does not throw for valid assertValidTransition", () => {
    expect(() => assertValidTransition("denied", "appealed")).not.toThrow();
  });

  it("returns allowed transitions for a status", () => {
    const allowed = allowedTransitions("denied");
    expect(allowed).toContain("appealed");
    expect(allowed).toContain("closed");
  });

  it("returns empty array for closed", () => {
    expect(allowedTransitions("closed")).toHaveLength(0);
  });
});
