import type { RawExtractedEvent } from "@authos/voice-adapters";
import { requiresHumanReview } from "@authos/domain";

// Extraction service — calls an AI provider to extract structured events from transcripts.
// Provider calls (Claude, OpenAI, etc.) go here. The rest of the app sees only RawExtractedEvent[].
export const extractionService = {
  async extractEvents(transcriptText: string, caseId: string): Promise<RawExtractedEvent[]> {
    // TODO: call AI provider (e.g. Claude via Anthropic SDK) with structured extraction prompt
    // Return normalized RawExtractedEvent[] with confidence scores
    console.log(`Extracting events for case ${caseId}, transcript length: ${transcriptText.length}`);
    return [];
  },

  needsHumanReview(event: RawExtractedEvent): boolean {
    return requiresHumanReview(event);
  },
};
