Phase 2 Voice/EHR Implementation Plan — AuthOS-Health

Context
Phase 2 (persistence + service layer + mock CRD + documents UI) is complete as of commit 6dcd871. This plan covers the two remaining Phase 2 tracks:

- Track A — Voice AI pipeline: wire Claude extraction, persist CallTranscript/ExtractedEvent, route low-confidence events to review
- Track B — EHR/SMART launch: mock FHIR server, ehrService, SMART launch routes that auto-create cases from FHIR context

User decision: mock FHIR server (same pattern as mock-crd) for Phase 2; real PKCE OAuth deferred to Phase 3.

Track A — Voice AI Pipeline

Step A1 — Wire Claude extraction
File: apps/worker-voice/src/services/extractionService.ts
Install @anthropic-ai/sdk. Call claude-sonnet-4-6 with tool use (extract_authorization_events tool).
Map tool output to RawExtractedEvent[]. Requires ANTHROPIC_API_KEY env var.

Step A2 — Wire transcript route
File: apps/worker-voice/src/routes/transcript.ts
Replace two TODO comments:
1. POST to ${API_URL}/api/voice/webhooks/transcript → get transcriptId
2. POST to ${API_URL}/api/voice/webhooks/event-extraction with extracted events

Step A3 — VoiceService
File: apps/api/src/services/voiceService.ts (new)
- persistTranscript(tenantId, payload) → create CallTranscript row
- persistExtractedEvents(tenantId, transcriptId, caseId, events) → create ExtractedEvent rows,
  auto-apply high-confidence safe events, create Task for review queue
- processReview(tenantId, eventId, decision, reviewedBy) → update status, apply if approved

Step A4 — Wire API voice routes
File: apps/api/src/routes/voice.ts
Replace stubs with voiceService calls. Return transcriptId on transcript POST.
Add voiceService to AppContext + buildContext in apps/api/src/lib/context.ts.

Track B — EHR/SMART Launch

Step B1 — Mock FHIR server
New app: apps/mock-fhir/ (port 3005)
Endpoints: GET /fhir/Patient/:id, GET /fhir/Coverage?patient=, GET /fhir/ServiceRequest?patient=
Returns scripted FhirPatient (John Smith), FhirCoverage (Aetna), FhirServiceRequest (FUSION).
Added to docker-compose.yml as mock-fhir service.

Step B2 — Add fhirId to CoverageRef
Prisma migration: add fhirId String field + @@unique([tenantId, fhirId]) to CoverageRef model.

Step B3 — EhrService
File: apps/api/src/services/ehrService.ts (new)
fetchAndSyncContext(tenantId, fhirBaseUrl, accessToken, patientId):
- Fetch Patient, Coverage, ServiceRequest from FHIR
- Map via fhir-adapters mappers
- Upsert PatientRef, CoverageRef, OrderRef by tenantId_fhirId
- Returns { patientRef, coverageRefId, orderRefId }

Step B4 — SMART launch routes
File: apps/api/src/routes/smart.ts (new)
GET /smart/launch/ehr?iss=&patient= → fetchAndSyncContext → createCase → redirect to web app
GET /smart/launch/standalone?iss=&patient= → same without launch token
Mounted in apps/api/src/index.ts at /smart (outside /api tenantAuth middleware).

Files changed
apps/worker-voice/src/services/extractionService.ts  Edit
apps/worker-voice/src/routes/transcript.ts           Edit
apps/api/src/services/voiceService.ts                Create
apps/api/src/routes/voice.ts                         Edit
apps/api/src/lib/context.ts                          Edit
apps/api/src/services/ehrService.ts                  Create
apps/api/src/routes/smart.ts                         Create
apps/api/src/index.ts                                Edit
apps/api/prisma/schema.prisma                        Edit (add fhirId to CoverageRef)
apps/mock-fhir/src/index.ts                          Create
apps/mock-fhir/package.json                          Create
apps/mock-fhir/tsconfig.json                         Create
infra/docker/docker-compose.yml                      Edit (add mock-fhir)

Verification
1. docker compose ... up postgres redis mock-crd mock-fhir -d
2. npm run dev -w apps/api && npm run dev -w apps/worker-voice
3. POST http://localhost:3002/voice/webhooks/transcript with test transcript → eventsExtracted > 0
4. GET http://localhost:3001/smart/launch/ehr?iss=http://localhost:3005/fhir&patient=patient-001 → redirects to /cases/:id
5. DB: CallTranscript, ExtractedEvent, PatientRef, CoverageRef, OrderRef, AuthorizationCase rows created
6. npm test -w apps/api
