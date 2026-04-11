import type {
  PayerAdapter,
  SubmissionPacket,
  PayerDecisionResponse,
} from "../types.js";

/**
 * Da Vinci PAS adapter — structural placeholder for real HL7 FHIR
 * Prior Authorization Support integration. Full implementation is
 * planned for Phase 4+.
 */
export class PasAdapter implements PayerAdapter {
  readonly protocol = "pas" as const;

  async submit(_packet: SubmissionPacket): Promise<PayerDecisionResponse> {
    throw new Error(
      "PAS adapter is not yet configured. Use the mock adapter for development."
    );
  }
}
