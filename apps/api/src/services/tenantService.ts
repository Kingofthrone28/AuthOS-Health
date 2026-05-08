import { type PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { AuditEmitter } from "@authos/audit";

export class TenantService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditEmitter,
  ) {}

  async create(data: { name: string; slug: string; adminEmail: string; adminName: string; adminPassword?: string | undefined }) {
    const tenant = await this.db.tenant.create({
      data: { name: data.name, slug: data.slug },
    });

    const passwordHash = data.adminPassword
      ? await bcrypt.hash(data.adminPassword, 12)
      : undefined;

    const user = await this.db.user.create({
      data: {
        tenantId: tenant.id,
        email: data.adminEmail,
        name: data.adminName,
        role: "admin",
        passwordHash: passwordHash ?? null,
      },
    });

    await this.db.tenantSettings.create({
      data: { tenantId: tenant.id },
    });

    await this.audit.emit({
      tenantId: tenant.id,
      entityType: "Tenant",
      entityId: tenant.id,
      action: "tenant.created",
      actorId: user.id,
      after: { name: tenant.name, slug: tenant.slug },
    });

    return { tenant, user };
  }

  async getById(id: string) {
    return this.db.tenant.findUnique({
      where: { id },
      include: { settings: true },
    });
  }

  async updateSettings(
    tenantId: string,
    data: {
      ssoProvider?: "oidc" | "saml" | null | undefined;
      ssoIssuerUrl?: string | null | undefined;
      ssoClientId?: string | null | undefined;
      ssoClientSecret?: string | null | undefined;
      fhirServerUrl?: string | null | undefined;
      payerEndpoint?: string | null | undefined;
      retentionDays?: number | undefined;
    },
    actorId: string,
  ) {
    const before = await this.db.tenantSettings.findUnique({ where: { tenantId } });

    // Filter undefined values — Prisma nullable fields expect `T | null`,
    // not `T | null | undefined`. Cast is safe: values come from Zod validation.
    const prismaData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Prisma.TenantSettingsUpdateInput;

    const settings = await this.db.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...prismaData } as Prisma.TenantSettingsUncheckedCreateInput,
      update: prismaData,
    });

    await this.audit.emit({
      tenantId,
      entityType: "TenantSettings",
      entityId: settings.id,
      action: "tenant.settings.updated",
      actorId,
      before: before ?? undefined,
      after: settings,
    });

    return settings;
  }

  async listUsers(tenantId: string) {
    return this.db.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createUser(
    tenantId: string,
    data: { email: string; name: string; role?: string | undefined; password?: string | undefined },
    actorId: string,
  ) {
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 12)
      : undefined;

    const user = await this.db.user.create({
      data: {
        tenantId,
        email: data.email,
        name: data.name,
        role: (data.role as "admin" | "clinician" | "auth_specialist" | "manager" | "read_only") ?? "auth_specialist",
        passwordHash: passwordHash ?? null,
      },
    });

    await this.audit.emit({
      tenantId,
      entityType: "User",
      entityId: user.id,
      action: "user.created",
      actorId,
      after: { email: user.email, name: user.name, role: user.role },
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
  }
}
