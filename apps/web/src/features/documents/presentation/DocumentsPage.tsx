import { Archive } from "lucide-react";
import { DocumentsFilteredView } from "./DocumentsFilteredView";
import type { AttachmentViewModel } from "../types";

interface DocumentsPageProps {
  documents: AttachmentViewModel[];
}

export function DocumentsPage({ documents }: DocumentsPageProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <Archive size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          This is a read-only audit view of all documents across cases.
          To upload a document, open the relevant case and use the requirements checklist.
        </p>
      </div>
      <DocumentsFilteredView documents={documents} />
    </div>
  );
}
