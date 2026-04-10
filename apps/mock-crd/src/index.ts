import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── CRD: Does this service require prior auth? ───────────────────────────────

interface CrdCheckBody {
  serviceCode: string;
  payerId:     string;
}

interface CrdRequirement {
  code:        string;
  description: string;
  required:    boolean;
}

// Service code prefix → requirements ruleset
const REQUIREMENTS_BY_SERVICE: Record<string, CrdRequirement[]> = {
  // Imaging
  MRI: [
    { code: "clinical_notes",   description: "Clinical notes from ordering provider",            required: true  },
    { code: "imaging_report",   description: "Prior imaging report (within 12 months)",          required: false },
    { code: "diagnosis_codes",  description: "Supporting ICD-10 diagnosis codes",                required: true  },
  ],
  CT: [
    { code: "clinical_notes",   description: "Clinical notes from ordering provider",            required: true  },
    { code: "diagnosis_codes",  description: "Supporting ICD-10 diagnosis codes",                required: true  },
  ],
  // Therapy
  PT: [
    { code: "prior_treatment",  description: "Documentation of prior conservative treatment",    required: true  },
    { code: "diagnosis_codes",  description: "Supporting ICD-10 diagnosis codes",                required: true  },
    { code: "functional_goals", description: "Functional goals and expected outcomes",            required: false },
  ],
  // Surgical
  FUSION: [
    { code: "clinical_notes",   description: "Surgical consult notes",                           required: true  },
    { code: "imaging_report",   description: "MRI or CT confirming structural pathology",        required: true  },
    { code: "prior_treatment",  description: "6-month conservative treatment documentation",     required: true  },
    { code: "diagnosis_codes",  description: "Supporting ICD-10 diagnosis codes",                required: true  },
    { code: "surgical_plan",    description: "Operative plan from surgeon",                      required: true  },
  ],
  ARTHROSCOPY: [
    { code: "clinical_notes",   description: "Orthopedic consult notes",                         required: true  },
    { code: "imaging_report",   description: "X-ray or MRI confirming indication",               required: true  },
    { code: "prior_treatment",  description: "Prior conservative treatment documentation",       required: true  },
  ],
  // Chemotherapy / oncology
  CHEMO: [
    { code: "pathology_report", description: "Pathology or biopsy report confirming diagnosis",  required: true  },
    { code: "treatment_plan",   description: "Oncologist treatment plan with regimen details",   required: true  },
    { code: "staging_report",   description: "Cancer staging documentation",                     required: true  },
  ],
  // Cardiac
  CATH: [
    { code: "clinical_notes",   description: "Cardiology consult notes",                         required: true  },
    { code: "stress_test",      description: "Stress test or non-invasive cardiac workup",       required: true  },
    { code: "diagnosis_codes",  description: "Supporting ICD-10 diagnosis codes",                required: true  },
  ],
  // Default fallback
  DEFAULT: [
    { code: "clinical_notes",   description: "Clinical notes supporting medical necessity",      required: true  },
    { code: "diagnosis_codes",  description: "Supporting ICD-10 diagnosis codes",                required: true  },
  ],
};

// Services that never require prior auth (whitelist)
const NO_AUTH_CODES = new Set(["LABS", "XRAY", "OFFICE"]);

function getRequirements(serviceCode: string): CrdRequirement[] {
  const upper = serviceCode.toUpperCase();
  if (NO_AUTH_CODES.has(upper)) return [];

  for (const [prefix, reqs] of Object.entries(REQUIREMENTS_BY_SERVICE)) {
    if (upper.includes(prefix)) return reqs;
  }
  return REQUIREMENTS_BY_SERVICE["DEFAULT"]!;
}

app.post("/crd/check", (req, res) => {
  const { serviceCode = "" } = req.body as CrdCheckBody;
  const requirements = getRequirements(serviceCode);

  res.json({
    authRequired:  requirements.length > 0,
    requirements,
  });
});

// ─── DTR: What questionnaire is needed? ───────────────────────────────────────

app.post("/dtr/questionnaire", (req, res) => {
  const { serviceCode = "" } = req.body as { serviceCode: string };
  const upper = serviceCode.toUpperCase();

  res.json({
    resourceType: "Questionnaire",
    id:           `dtr-${upper.toLowerCase()}-questionnaire`,
    status:       "active",
    title:        `Prior Authorization Questionnaire — ${serviceCode}`,
    item: [
      {
        linkId:   "1",
        text:     "What is the primary diagnosis code (ICD-10)?",
        type:     "string",
        required: true,
      },
      {
        linkId:   "2",
        text:     "Has the patient undergone prior conservative treatment for this condition?",
        type:     "boolean",
        required: upper.includes("PT") || upper.includes("FUSION") || upper.includes("ARTHROSCOPY"),
      },
      {
        linkId:   "3",
        text:     "Briefly describe the medical necessity for this service.",
        type:     "text",
        required: true,
      },
    ],
  });
});

const PORT = process.env["PORT"] ?? 3004;
app.listen(PORT, () => {
  console.log(`mock-crd listening on port ${PORT}`);
});

export { app };
