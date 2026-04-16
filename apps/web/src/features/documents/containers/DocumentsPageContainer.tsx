import { requireSession } from "@/lib/session";
import { apiFetch } from "@/lib/api/client";
import { DocumentsPage } from "../presentation/DocumentsPage";
import type { AttachmentViewModel } from "../types";

interface ApiAttachment {
  id: string;
  caseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  classification: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

function toViewModel(a: ApiAttachment, tenantId: string): AttachmentViewModel {
  return {
    id:             a.id,
    caseId:         a.caseId,
    fileName:       a.fileName,
    mimeType:       a.mimeType,
    sizeBytes:      a.sizeBytes,
    classification: a.classification ?? "unclassified",
    uploadedBy:     a.uploadedBy,
    uploadedAt:     new Date(a.uploadedAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
    uploadedAtIso:  a.uploadedAt,
    tenantId,
  };
}

export async function DocumentsPageContainer() {
  const session = await requireSession();

  let documents: AttachmentViewModel[] = [];
  try {
    const raw = await apiFetch<ApiAttachment[]>("/api/documents", {
      tenantId:    session.tenantId,
      accessToken: session.accessToken,
    });
    documents = raw.map((a) => toViewModel(a, session.tenantId));
  } catch {
    // Gracefully degrade — show empty state rather than crash
  }

  return <DocumentsPage documents={documents} />;
}
