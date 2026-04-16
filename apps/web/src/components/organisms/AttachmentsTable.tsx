import { FileText, Tag } from "lucide-react";
import type { AttachmentViewModel } from "@/features/documents/types";
import { DownloadButton } from "@/features/documents/presentation/DownloadButton";

interface AttachmentsTableProps {
  documents: AttachmentViewModel[];
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  clinical_notes:  "Clinical Notes",
  imaging_report:  "Imaging Report",
  lab_results:     "Lab Results",
  denial_letter:   "Denial Letter",
  appeal_letter:   "Appeal Letter",
  auth_form:       "Auth Form",
  unclassified:    "Unclassified",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsTable({ documents }: AttachmentsTableProps) {
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-10 text-center">
        <FileText size={32} className="mx-auto text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">
          Documents <span className="text-gray-400 font-normal ml-1">({documents.length})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Classification</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">By</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-blue-400 shrink-0" />
                    <span className="text-gray-800 font-medium truncate max-w-xs">{doc.fileName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  #{doc.caseId.slice(-6).toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    <Tag size={11} />
                    {CLASSIFICATION_LABELS[doc.classification ?? "unclassified"] ?? doc.classification ?? "Unclassified"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatBytes(doc.sizeBytes)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{doc.uploadedAt}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{doc.uploadedBy}</td>
                <td className="px-4 py-3 text-right">
                  <DownloadButton
                    attachmentId={doc.id}
                    fileName={doc.fileName}
                    tenantId={doc.tenantId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
