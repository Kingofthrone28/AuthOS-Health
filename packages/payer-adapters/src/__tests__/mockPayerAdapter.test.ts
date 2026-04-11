import { MockPayerAdapter } from "../adapters/mockPayerAdapter.js";
import type { SubmissionPacket } from "../types.js";

// Requires mock-payer server running on localhost:3006
const PAYER_URL = process.env["PAYER_URL"] ?? "http://localhost:3006";
const adapter = new MockPayerAdapter(PAYER_URL);

function buildPacket(overrides: Partial<SubmissionPacket> = {}): SubmissionPacket {
  return {
    protocol: "portal",
    tenantId: "test-tenant",
    caseId: "test-case-001",
    patientMemberId: "MBR-001",
    payerId: "PAYER-001",
    serviceCode: "70553",
    serviceType: "MRI Brain",
    priority: "standard",
    diagnosisCodes: ["G89.4"],
    attachmentRefs: ["att-001"],
    ...overrides,
  };
}

describe("MockPayerAdapter", () => {
  it("returns approved for MRI with attachments", async () => {
    const response = await adapter.submit(buildPacket());

    expect(response.decision).toBe("approved");
    expect(response.authNumber).toBeDefined();
    expect(response.protocol).toBe("portal");
  });

  it("returns more_info when no attachments", async () => {
    const response = await adapter.submit(
      buildPacket({ attachmentRefs: [] })
    );

    expect(response.decision).toBe("more_info");
  });

  it("returns denied for experimental service codes", async () => {
    const response = await adapter.submit(
      buildPacket({ serviceCode: "0123T", attachmentRefs: ["att-001"] })
    );

    expect(response.decision).toBe("denied");
    expect(response.denialReason).toBeDefined();
    expect(response.denialCode).toBe("PA-DENY-EXP");
  });

  it("returns peer_review for PT codes", async () => {
    const response = await adapter.submit(
      buildPacket({ serviceCode: "97110", attachmentRefs: ["att-001"] })
    );

    expect(response.decision).toBe("peer_review");
  });
});
