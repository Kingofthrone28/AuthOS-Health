import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Scripted FHIR resources ──────────────────────────────────────────────────
// Accepts any Authorization: Bearer * header (mock bypass).
// Real SMART OAuth is deferred to Phase 3.

const PATIENTS: Record<string, object> = {
  "patient-001": {
    resourceType: "Patient",
    id: "patient-001",
    identifier: [{ system: "urn:oid:2.16.840.1.113883.4.1", value: "P00123" }],
    name: [{ family: "Smith", given: ["John"] }],
    birthDate: "1972-04-15",
    gender: "male",
  },
  "patient-002": {
    resourceType: "Patient",
    id: "patient-002",
    identifier: [{ system: "urn:oid:2.16.840.1.113883.4.1", value: "P00456" }],
    name: [{ family: "Patel", given: ["Anika"] }],
    birthDate: "1988-09-03",
    gender: "female",
  },
};

const COVERAGES: Record<string, object> = {
  "patient-001": {
    resourceType: "Coverage",
    id: "coverage-001",
    subscriber: { reference: "Patient/patient-001" },
    beneficiary: { reference: "Patient/patient-001" },
    payor: [{ reference: "Organization/aetna", display: "Aetna" }],
    subscriberId: "M-99123",
    class: [
      {
        type: { coding: [{ code: "plan" }] },
        value: "GROUP-0042",
        name: "Aetna Choice POS II",
      },
    ],
  },
  "patient-002": {
    resourceType: "Coverage",
    id: "coverage-002",
    subscriber: { reference: "Patient/patient-002" },
    beneficiary: { reference: "Patient/patient-002" },
    payor: [{ reference: "Organization/cigna", display: "Cigna" }],
    subscriberId: "M-78901",
    class: [
      {
        type: { coding: [{ code: "plan" }] },
        value: "GROUP-0099",
        name: "Cigna Open Access Plus",
      },
    ],
  },
};

const SERVICE_REQUESTS: Record<string, object> = {
  "patient-001": {
    resourceType: "ServiceRequest",
    id: "sr-001",
    subject: { reference: "Patient/patient-001" },
    requester: { reference: "Practitioner/dr-jones" },
    code: {
      coding: [
        {
          system:  "http://www.ama-assn.org/go/cpt",
          code:    "22612",
          display: "Spinal Fusion L4-L5 (FUSION)",
        },
      ],
    },
    authoredOn: "2026-04-08",
  },
  "patient-002": {
    resourceType: "ServiceRequest",
    id: "sr-002",
    subject: { reference: "Patient/patient-002" },
    requester: { reference: "Practitioner/dr-patel" },
    code: {
      coding: [
        {
          system:  "http://www.ama-assn.org/go/cpt",
          code:    "70553",
          display: "MRI Brain w/ Contrast (MRI)",
        },
      ],
    },
    authoredOn: "2026-04-09",
  },
};

// ─── FHIR R4 endpoints ────────────────────────────────────────────────────────

// GET /fhir/Patient/:id
app.get("/fhir/Patient/:id", (req, res) => {
  const patient = PATIENTS[req.params["id"] ?? ""];
  if (!patient) {
    res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found" }] });
    return;
  }
  res.json(patient);
});

// GET /fhir/Coverage?patient=:patientId
app.get("/fhir/Coverage", (req, res) => {
  const patientId = req.query["patient"] as string | undefined;
  const coverage = patientId ? COVERAGES[patientId] : undefined;

  res.json({
    resourceType: "Bundle",
    type: "searchset",
    total: coverage ? 1 : 0,
    entry: coverage ? [{ resource: coverage }] : [],
  });
});

// GET /fhir/ServiceRequest?patient=:patientId
app.get("/fhir/ServiceRequest", (req, res) => {
  const patientId = req.query["patient"] as string | undefined;
  const sr = patientId ? SERVICE_REQUESTS[patientId] : undefined;

  res.json({
    resourceType: "Bundle",
    type: "searchset",
    total: sr ? 1 : 0,
    entry: sr ? [{ resource: sr }] : [],
  });
});

const PORT = process.env["PORT"] ?? 3005;
app.listen(PORT, () => {
  console.log(`mock-fhir listening on port ${PORT}`);
});

export { app };
