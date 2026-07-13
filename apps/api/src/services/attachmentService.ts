import type { PrismaClient } from "@prisma/client";
import { DomainEvents } from "@authos/domain";
import { AuditService } from "./auditService.js";
import { withTenant } from "../lib/prisma.js";
import { completeRequirementInTransaction } from "./requirementsService.js";
import { decryptTenantBuffer, encryptTenantBuffer } from "../lib/tenantEncryption.js";
import * as path from "node:path";
import * as fs from "node:fs/promises";

// Local upload directory — swap for S3/blob storage in production
const UPLOAD_DIR = process.env["UPLOAD_DIR"] ?? "./uploads";

const CLASSIFICATION_MAP: Record<string, string> = {
  "clinical_notes":    "clinical_notes",
  "imaging":           "imaging_report",
  "lab":               "lab_results",
  "denial":            "denial_letter",
  "appeal":            "appeal_letter",
  "authorization":     "auth_form",
};

function classifyByFilename(fileName: string): string {
  const lower = fileName.toLowerCase();
  for (const [keyword, classification] of Object.entries(CLASSIFICATION_MAP)) {
    if (lower.includes(keyword)) return classification;
  }
  return "unclassified";
}

export interface UploadAttachmentInput {
  fileName:     string;
  mimeType:     string;
  sizeBytes:    number;
  buffer:       Buffer;
  uploadedBy:   string;
  requirementId?: string | undefined;
}

export class AttachmentService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async uploadAttachment(tenantId: string, caseId: string, input: UploadAttachmentInput) {
    // Ensure upload dir exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const safeFileName = path.basename(input.fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = path.join(UPLOAD_DIR, `${Date.now()}-${safeFileName}.enc`);
    const encryptedBuffer = encryptTenantBuffer(tenantId, input.buffer);
    await fs.writeFile(storageRef, encryptedBuffer);

    const classification = classifyByFilename(input.fileName);

    try {
      return await withTenant(this.db, tenantId, async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            caseId,
            tenantId,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            storageRef,
            encrypted: true,
            classification,
            uploadedBy: input.uploadedBy,
          },
        });

        const audit = new AuditService(tx);
        await audit.emit({
          tenantId,
          entityType: "Attachment",
          entityId: attachment.id,
          action: DomainEvents.ATTACHMENT_UPLOADED,
          actorId: input.uploadedBy,
          after: { fileName: input.fileName, classification },
        });

        if (input.requirementId) {
          await completeRequirementInTransaction(
            tx,
            tenantId,
            caseId,
            input.requirementId,
            input.uploadedBy,
          );
        }

        return attachment;
      });
    } catch (error) {
      await fs.unlink(storageRef).catch(() => undefined);
      throw error;
    }
  }

  async getAttachment(tenantId: string, attachmentId: string) {
    return withTenant(this.db, tenantId, (tx) => tx.attachment.findFirst({
      where: { id: attachmentId, tenantId },
    }));
  }

  async readAttachment(tenantId: string, attachmentId: string) {
    const attachment = await this.getAttachment(tenantId, attachmentId);
    if (!attachment) return null;
    const stored = await fs.readFile(attachment.storageRef);
    return {
      attachment,
      content: attachment.encrypted ? decryptTenantBuffer(tenantId, stored) : stored,
    };
  }

  async listAttachments(tenantId: string, caseId: string) {
    return withTenant(this.db, tenantId, (tx) => tx.attachment.findMany({
      where:   { caseId, tenantId },
      orderBy: { uploadedAt: "desc" },
    }));
  }

  async listAllForTenant(tenantId: string) {
    return withTenant(this.db, tenantId, (tx) => tx.attachment.findMany({
      where:   { tenantId },
      include: { case: { select: { id: true, serviceType: true, patientRefId: true } } },
      orderBy: { uploadedAt: "desc" },
    }));
  }

  async classifyAttachment(tenantId: string, attachmentId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
    const attachment = await tx.attachment.findFirstOrThrow({
      where: { id: attachmentId, tenantId },
    });

    const classification = classifyByFilename(attachment.fileName);

    const updated = await tx.attachment.update({
      where: { id: attachmentId },
      data:  { classification },
    });

    await new AuditService(tx).emit({
      tenantId,
      entityType: "Attachment",
      entityId:   attachmentId,
      action:     DomainEvents.ATTACHMENT_CLASSIFIED,
      after:      { classification },
    });

    return updated;
    });
  }
}
