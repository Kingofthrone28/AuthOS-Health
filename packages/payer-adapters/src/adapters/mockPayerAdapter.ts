import type {
  PayerAdapter,
  SubmissionPacket,
  PayerDecisionResponse,
} from "../types.js";

export class MockPayerAdapter implements PayerAdapter {
  readonly protocol = "pas" as const;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env["PAYER_URL"] ?? "http://localhost:3006";
  }

  async submit(packet: SubmissionPacket): Promise<PayerDecisionResponse> {
    const res = await fetch(`${this.baseUrl}/payer/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packet),
    });

    if (!res.ok) {
      throw new Error(`Mock payer returned ${res.status}: ${await res.text()}`);
    }

    return (await res.json()) as PayerDecisionResponse;
  }

  async pollStatus(authNumber: string): Promise<PayerDecisionResponse> {
    const res = await fetch(`${this.baseUrl}/payer/status/${authNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Mock payer status returned ${res.status}: ${await res.text()}`);
    }

    return (await res.json()) as PayerDecisionResponse;
  }
}
