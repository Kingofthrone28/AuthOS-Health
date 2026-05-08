// TwiML webhook — returns the XML Twilio needs to connect a call to the media stream.
//
// Configure this URL as the "A call comes in" webhook in the Twilio console,
// or programmatically via the Twilio REST API when placing an outbound follow-up call.
//
// Required query params:
//   tenantId — the tenant scoping the call
//
// Optional:
//   caseId   — the AuthorizationCase id this call is associated with
//   dialTo   — if present, Twilio dials this number and streams both legs
//              (outbound payer calls); if absent, a <Pause> holds the call
//              open while the media stream runs (inbound scenario / conference).

import { Router } from "express";

export const twimlRouter = Router();

const WORKER_WS_URL = process.env["WORKER_WS_URL"] ?? "wss://localhost:3002";

// GET /voice/twiml
twimlRouter.get("/twiml", (req, res) => {
  const { caseId, tenantId, dialTo, direction } = req.query as Record<string, string | undefined>;

  if (!tenantId) {
    res.status(400).type("text/plain").send("tenantId is required");
    return;
  }

  // Embed caseId and tenantId in the stream WebSocket URL so the worker knows
  // which tenant and optional case to associate the transcript with.
  const streamUrl =
    `${WORKER_WS_URL}/voice/twilio-media` +
    `?tenantId=${encodeURIComponent(tenantId)}` +
    (caseId ? `&caseId=${encodeURIComponent(caseId)}` : "") +
    (direction ? `&direction=${encodeURIComponent(direction)}` : "");

  // <Dial> for outbound calls to payers (streams both audio legs).
  // <Pause> for inbound calls or conference legs where there is no destination to dial.
  const callAction = dialTo
    ? `<Dial>${escapeXml(dialTo)}</Dial>`
    : `<Pause length="300"/>`;

  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${escapeXml(streamUrl)}" />
  </Start>
  ${callAction}
</Response>`);
});

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
