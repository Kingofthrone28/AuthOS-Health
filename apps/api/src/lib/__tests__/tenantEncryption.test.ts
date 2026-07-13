import { decryptTenantBuffer, encryptTenantBuffer } from "../tenantEncryption.js";

describe("tenant encryption", () => {
  const originalKey = process.env["TENANT_ENCRYPTION_KEY"];

  beforeAll(() => {
    process.env["TENANT_ENCRYPTION_KEY"] = "unit-test-tenant-key-that-is-long-enough";
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env["TENANT_ENCRYPTION_KEY"];
    else process.env["TENANT_ENCRYPTION_KEY"] = originalKey;
  });

  it("round-trips data for the owning tenant", () => {
    const encrypted = encryptTenantBuffer("tenant-a", Buffer.from("synthetic document"));
    expect(decryptTenantBuffer("tenant-a", encrypted).toString()).toBe("synthetic document");
  });

  it("does not decrypt with another tenant key", () => {
    const encrypted = encryptTenantBuffer("tenant-a", Buffer.from("synthetic document"));
    expect(() => decryptTenantBuffer("tenant-b", encrypted)).toThrow();
  });
});
