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
    const passwordHash = adminPassword
      ? await bcrypt.hash(adminPassword, 12)
      : undefined;

    const tenant = await db.tenant.upsert({
      where:  { slug: tenantSlug },
      update: { name: tenantName },
      create: { name: tenantName, slug: tenantSlug },
    });

    await db.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
      update: {
        name: adminName,
        role: "admin",
        ...(passwordHash ? { passwordHash } : {}),
      },
      create: {
        tenantId: tenant.id,
        email: adminEmail,
        name: adminName,
        role: "admin",
        passwordHash: passwordHash ?? null,
      },
    });

    const ssoProvider = process.env["SSO_PROVIDER"] as "oidc" | "saml" | undefined;

    await db.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        ssoProvider: ssoProvider ?? null,
        ssoIssuerUrl: process.env["SSO_ISSUER_URL"] ?? null,
        ssoClientId: process.env["SSO_CLIENT_ID"] ?? null,
        ssoClientSecret: process.env["SSO_CLIENT_SECRET"] ?? null,
        fhirServerUrl: process.env["FHIR_SERVER_URL"] ?? null,
        payerEndpoint: process.env["PAYER_URL"] ?? null,
      },
      create: {
        tenantId: tenant.id,
        ssoProvider: ssoProvider ?? null,
        ssoIssuerUrl: process.env["SSO_ISSUER_URL"] ?? null,
        ssoClientId: process.env["SSO_CLIENT_ID"] ?? null,
        ssoClientSecret: process.env["SSO_CLIENT_SECRET"] ?? null,
        fhirServerUrl: process.env["FHIR_SERVER_URL"] ?? null,
        payerEndpoint: process.env["PAYER_URL"] ?? null,
      },
    });

    console.log(`Tenant '${tenantSlug}' ensured (id=${tenant.id}); admin user '${adminEmail}' synced.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
