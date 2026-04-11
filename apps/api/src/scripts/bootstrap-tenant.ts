/**
 * Idempotent single-tenant bootstrap script.
 *
 * Reads configuration from environment variables and ensures the tenant,
 * admin user, and settings row exist. Safe to run on every container start.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/bootstrap-tenant.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const tenantMode = process.env["TENANT_MODE"];
  if (tenantMode !== "single") {
    console.log("TENANT_MODE is not 'single', skipping bootstrap.");
    return;
  }

  const tenantName = process.env["TENANT_NAME"];
  const tenantSlug = process.env["TENANT_SLUG"];
  const adminEmail = process.env["ADMIN_EMAIL"];
  const adminName = process.env["ADMIN_NAME"] ?? "Admin";
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!tenantName || !tenantSlug || !adminEmail) {
    console.error("Missing required env: TENANT_NAME, TENANT_SLUG, ADMIN_EMAIL");
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    const existing = await db.tenant.findUnique({ where: { slug: tenantSlug } });

    if (existing) {
      console.log(`Tenant '${tenantSlug}' already exists (id=${existing.id}), skipping creation.`);
    } else {
      const passwordHash = adminPassword
        ? await bcrypt.hash(adminPassword, 12)
        : undefined;

      const tenant = await db.tenant.create({
        data: { name: tenantName, slug: tenantSlug },
      });

      await db.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          name: adminName,
          role: "admin",
          passwordHash: passwordHash ?? null,
        },
      });

      const ssoProvider = process.env["SSO_PROVIDER"] as "oidc" | "saml" | undefined;

      await db.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          ssoProvider: ssoProvider ?? null,
          ssoIssuerUrl: process.env["SSO_ISSUER_URL"] ?? null,
          ssoClientId: process.env["SSO_CLIENT_ID"] ?? null,
          ssoClientSecret: process.env["SSO_CLIENT_SECRET"] ?? null,
          fhirServerUrl: process.env["FHIR_SERVER_URL"] ?? null,
          payerEndpoint: process.env["PAYER_URL"] ?? null,
        },
      });

      console.log(`Tenant '${tenantSlug}' created (id=${tenant.id}) with admin user '${adminEmail}'.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
