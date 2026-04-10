export interface AttachmentViewModel {
  id: string;
  caseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  classification: string | undefined;
  uploadedBy: string;
  uploadedAt: string;
}
