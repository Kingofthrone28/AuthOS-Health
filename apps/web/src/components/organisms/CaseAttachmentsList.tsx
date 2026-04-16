import { Paperclip } from "lucide-react";
import type { AttachmentViewModel } from "@/features/case-detail/types";

interface CaseAttachmentsListProps {
  attachments: AttachmentViewModel[];
}

export function CaseAttachmentsList({ attachments }: CaseAttachmentsListProps) {
  if (attachments.length === 0) return null;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Attachments <span className="text-gray-300 font-normal ml-1">({attachments.length})</span>
      </h2>
      <ul className="space-y-2">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm text-gray-700">
            <Paperclip size={14} className="text-gray-400 shrink-0" />
            <span className="truncate">{a.fileName}</span>
            {a.classification && (
              <span className="ml-auto text-xs text-gray-400 shrink-0">{a.classification}</span>
            )}
            <span className="text-xs text-gray-400 shrink-0">{a.uploadedAt}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
