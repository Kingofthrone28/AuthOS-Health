import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function masterKey(): Buffer {
  const configured = process.env["TENANT_ENCRYPTION_KEY"];
  if (!configured || configured.length < 32) {
    throw new Error("TENANT_ENCRYPTION_KEY must be at least 32 characters");
  }
  return createHmac("sha256", configured).update("authos-health-master-key").digest();
}

function tenantKey(tenantId: string): Buffer {
  return createHmac("sha256", masterKey()).update(`tenant:${tenantId}`).digest();
}

export function encryptTenantBuffer(tenantId: string, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, tenantKey(tenantId), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, ciphertext]);
}

export function decryptTenantBuffer(tenantId: string, encrypted: Buffer): Buffer {
  if (encrypted.length < 1 + IV_BYTES + TAG_BYTES || encrypted[0] !== 1) {
    throw new Error("Unsupported encrypted attachment format");
  }
  const iv = encrypted.subarray(1, 1 + IV_BYTES);
  const tag = encrypted.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const ciphertext = encrypted.subarray(1 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, tenantKey(tenantId), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
