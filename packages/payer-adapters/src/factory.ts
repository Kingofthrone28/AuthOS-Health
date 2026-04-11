import type { PayerAdapter, SubmissionProtocol } from "./types.js";
import { MockPayerAdapter } from "./adapters/mockPayerAdapter.js";
import { PasAdapter } from "./adapters/pasAdapter.js";

export interface PayerAdapterConfig {
  payerUrl?: string | undefined;
}

const adapters: Record<SubmissionProtocol, (cfg: PayerAdapterConfig) => PayerAdapter> = {
  pas: () => new PasAdapter(),
  fhir: () => {
    throw new Error("FHIR payer adapter not implemented");
  },
  x12: () => {
    throw new Error("X12 payer adapter not implemented");
  },
  portal: (cfg) => new MockPayerAdapter(cfg.payerUrl),
};

/**
 * Returns the appropriate payer adapter for the given protocol.
 * In development/mock mode, use "portal" protocol to route to mock-payer.
 */
export function getPayerAdapter(
  protocol: SubmissionProtocol,
  config: PayerAdapterConfig = {}
): PayerAdapter {
  const factory = adapters[protocol];
  return factory(config);
}
