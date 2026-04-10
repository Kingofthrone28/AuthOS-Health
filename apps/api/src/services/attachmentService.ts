import type { PrismaClient } from "@prisma/client";
import { DomainEvents } from "@authos/domain";
import type { AuditService } from "./auditService.js";
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
}

export class AttachmentService {
  constructor(
    private readonly db: PrismaClient,
    private readonly audit: AuditService
  ) {}

  async uploadAttachment(tenantId: string, caseId: string, input: UploadAttachmentInput) {
    // Ensure upload dir exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const storageRef = path.join(UPLOAD_DIR, `${Date.now()}-${input.fileName}`);
    await fs.writeFile(storageRef, input.buffer);

    const classification = classifyByFilename(input.fileName);

    const attachment = await this.db.attachment.create({
      data: {
        caseId,
        tenantId,
        fileName:       input.fileName,
        mimeType:       input.mimeType,
        sizeBytes:      input.sizeBytes,
        storageRef,
        classification,
        uploadedBy:     input.uploadedBy,
      },
    });

    await this.audit.emit({
      tenantId,
      entityType: "Attachment",
      entityId:   attachment.id,
      action:     DomainEvents.ATTACHMENT_UPLOADED,
      actorId:    input.uploadedBy,
      after:      { fileName: input.fileName, classification },
    });

    return attachment;
  }

  async listAttachments(tenantId: string, caseId: string) {
    return this.db.attachment.findMany({
      where:   { caseId, tenantId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async listAllForTenant(tenantId: string) {
    return this.db.attachment.findMany({
      where:   { tenantId },
      include: { case: { select: { id: true, serviceType: true, patientRefId: true } } },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async classifyAttachment(tenantId: string, attachmentId: string) {
    const attachment = await this.db.attachment.findFirstOrThrow({
      where: { id: attachmentId, tenantId },
    });

    const classification = classifyByFilename(attachment.fileName);

    const updated = await this.db.attachment.update({
      where: { id: attachmentId },
      data:  { classification },
    });

    await this.audit.emit({
      tenantId,
      entityType: "Attachment",
      entityId:   attachmentId,
      action:     DomainEvents.ATTACHMENT_CLASSIFIED,
      after:      { classification },
    });

    return updated;
  }
}
