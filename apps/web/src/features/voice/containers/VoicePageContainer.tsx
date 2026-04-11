import { fetchVoiceStats, fetchTranscripts, fetchPendingEvents } from "@/lib/voice/queries";
import { buildVoicePageViewModel } from "../mappers";
import { VoicePage } from "../presentation/VoicePage";

export async function VoicePageContainer() {
  const tenantId = "default";

  const [stats, transcripts, pendingEvents] = await Promise.all([
    fetchVoiceStats(tenantId),
    fetchTranscripts(tenantId),
    fetchPendingEvents(tenantId),
  ]);

  const viewModel = buildVoicePageViewModel(stats, transcripts, pendingEvents);

  return <VoicePage {...viewModel} />;
}
