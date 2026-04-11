-- CreateEnum
CREATE TYPE "SsoProvider" AS ENUM ('oidc', 'saml');

-- AlterTable: add passwordHash to User
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- CreateTable: TenantSettings
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ssoProvider" "SsoProvider",
    "ssoIssuerUrl" TEXT,
    "ssoClientId" TEXT,
    "ssoClientSecret" TEXT,
    "fhirServerUrl" TEXT,
    "payerEndpoint" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
