import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// In-memory store for pending submissions that resolve asynchronously
const pendingDecisions = new Map<
  string,
  { decision: string; denialReason?: string; denialCode?: string }
>();

interface SubmissionBody {
  protocol?: string;
  caseId?: string;
  serviceCode?: string;
  serviceType?: string;
  priority?: string;
  diagnosisCodes?: string[];
  attachmentRefs?: string[];
  narrativeSummary?: string;
}

function generateAuthNumber(): string {
  return `AUTH-${Date.now().toString(36).toUpperCase()}`;
}

// POST /payer/submit — scripted payer decision based on service code patterns
app.post("/payer/submit", (req, res) => {
  const body = req.body as SubmissionBody;
  const serviceCode = (body.serviceCode ?? "").toUpperCase();
  const serviceType = (body.serviceType ?? "").toUpperCase();
  const hasAttachments = (body.attachmentRefs ?? []).length > 0;
  const priority = body.priority ?? "standard";

  let decision: "approved" | "denied" | "more_info" | "peer_review" | "pending";
  let denialReason: string | undefined;
  let denialCode: string | undefined;
  let authNumber: string | undefined;

  // Surgical codes (CPT 2xxxx) with full docs -> approved
  if (serviceCode.startsWith("2") && hasAttachments) {
    decision = "approved";
    authNumber = generateAuthNumber();
  }
  // MRI codes (CPT 70xxx) with attachments -> approved
  else if (serviceCode.startsWith("70") && hasAttachments) {
    decision = "approved";
    authNumber = generateAuthNumber();
  }
  // Any request missing attachments -> more_info
  else if (!hasAttachments) {
    decision = "more_info";
  }
  // PT codes (CPT 97xxx) -> peer_review
  else if (serviceCode.startsWith("97")) {
    decision = "peer_review";
  }
  // Urgent requests -> pending (async decision)
  else if (priority === "urgent") {
    decision = "pending";
    authNumber = generateAuthNumber();
    pendingDecisions.set(authNumber, { decision: "approved" });
  }
  // Experimental/cosmetic codes (CPT 0xxx) -> denied
  else if (serviceCode.startsWith("0")) {
    decision = "denied";
    denialReason = "Service not covered under current plan — classified as experimental";
    denialCode = "PA-DENY-EXP";
  }
  // Duplicate therapy within window -> denied
  else if (serviceType.includes("DUPLICATE")) {
    decision = "denied";
    denialReason = "Duplicate service request within 90-day window";
    denialCode = "PA-DENY-DUP";
  }
  // Default with docs -> approved
  else {
    decision = "approved";
    authNumber = generateAuthNumber();
  }

  res.json({
    protocol: body.protocol ?? "pas",
    rawPayload: { mockServer: true, serviceCode, serviceType },
    decision,
    authNumber,
    denialReason,
    denialCode,
  });
});

// POST /payer/status/:authNumber — poll for async decision resolution
app.post("/payer/status/:authNumber", (req, res) => {
  const authNumber = req.params["authNumber"] ?? "";
  const pending = pendingDecisions.get(authNumber);

  if (pending) {
    pendingDecisions.delete(authNumber);
    res.json({
      authNumber,
      decision: pending.decision,
      denialReason: pending.denialReason,
      denialCode: pending.denialCode,
    });
    return;
  }

  res.json({
    authNumber,
    decision: "pending",
  });
});

const PORT = process.env["PORT"] ?? 3006;
app.listen(PORT, () => {
  console.log(`mock-payer listening on port ${PORT}`);
});

export { app };
