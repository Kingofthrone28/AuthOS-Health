import { fetchVoiceStats, fetchTranscripts, fetchPendingEvents } from "@/lib/voice/queries";
import { requireSession } from "@/lib/session";
import { buildVoicePageViewModel } from "../mappers";
import { VoicePage } from "../presentation/VoicePage";

export async function VoicePageContainer() {
  const session = await requireSession();
  const tenantId = session.tenantId;

  const [stats, transcripts, pendingEvents] = await Promise.all([
    fetchVoiceStats(tenantId, session.accessToken),
    fetchTranscripts(tenantId, session.accessToken),
    fetchPendingEvents(tenantId, session.accessToken),
  ]);

  const viewModel = buildVoicePageViewModel(stats, transcripts, pendingEvents);

  return <VoicePage {...viewModel} />;
}
