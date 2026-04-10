import { DocumentsPage } from "../presentation/DocumentsPage";
import type { AttachmentViewModel } from "../types";

// TODO: replace with real API call scoped to session tenant
async function fetchDocuments(): Promise<AttachmentViewModel[]> {
  return [];
}

export async function DocumentsPageContainer() {
  const documents = await fetchDocuments();
  return <DocumentsPage documents={documents} />;
}
