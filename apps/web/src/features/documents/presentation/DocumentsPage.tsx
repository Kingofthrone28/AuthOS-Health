import { AttachmentsTable } from "@/components/organisms/AttachmentsTable";
import { UploadPanel } from "./UploadPanel";
import type { AttachmentViewModel } from "../types";

interface DocumentsPageProps {
  documents: AttachmentViewModel[];
}

export function DocumentsPage({ documents }: DocumentsPageProps) {
  return (
    <div className="space-y-5">
      <UploadPanel />
      <AttachmentsTable documents={documents} />
    </div>
  );
}
