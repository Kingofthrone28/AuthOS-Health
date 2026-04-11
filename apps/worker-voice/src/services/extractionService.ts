import Anthropic from "@anthropic-ai/sdk";
import type { RawExtractedEvent } from "@authos/voice-adapters";
import type { ExtractedEventType } from "@authos/shared-types";
import { requiresHumanReview } from "@authos/domain";

const client = new Anthropic();

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_authorization_events",
  description:
    "Extract structured prior-authorization facts from a payer call transcript. " +
    "Return every distinct fact with a confidence score between 0 and 1.",
  input_schema: {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            event_type: {
              type: "string",
              enum: [
                "reference_number",
                "auth_status",
                "missing_document",
                "denial_reason",
                "peer_review_required",
                "callback_deadline",
                "approval_number",
                "other",
              ],
            },
            value:      { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["event_type", "value", "confidence"],
        },
      },
    },
    required: ["events"],
  },
};

export const extractionService = {
  async extractEvents(transcriptText: string, caseId: string): Promise<RawExtractedEvent[]> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content:
            `Extract all prior-authorization facts from the following payer call transcript for case ${caseId}. ` +
            `Include reference numbers, authorization status, missing documents, denial reasons, ` +
            `peer review requirements, callback deadlines, and approval numbers.\n\n` +
            `<transcript>\n${transcriptText}\n</transcript>`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return [];

    const input = toolUse.input as {
      events: Array<{ event_type: string; value: string; confidence: number }>;
    };

    return input.events.map((e) => ({
      eventType:  e.event_type as ExtractedEventType,
      value:      e.value,
      confidence: e.confidence,
    }));
  },

  needsHumanReview(event: RawExtractedEvent): boolean {
    return requiresHumanReview(event);
  },
};
