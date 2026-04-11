Phase 2 Implementation Plan — AuthOS-Health
Context
Phase 1 delivered the full monorepo scaffold: type system, domain logic, API route definitions (all stubbed), UI shell with dashboard/work queue/cases list, worker entry points, and atomic component library. All API routes return stub data with "TODO: wire to database" comments. Phase 2 adds the persistence layer, service classes, mock CRD/DTR server, and document intake — making the app functionally real.

User decisions:

Persistence: Postgres + Prisma ORM (wired to existing Docker Postgres service)
CRD/DTR: Mock server (lightweight Express.js service returning scripted requirements responses)
Priority: Database + service layer first, then surface it through existing routes
Step 1 — Prisma schema and migration
Install Prisma in apps/api:

npm install prisma @prisma/client -w apps/api
npx prisma init --schema=apps/api/prisma/schema.prisma
Create apps/api/prisma/schema.prisma mapping all entities from packages/shared-types:

Tenant, User
PatientRef, CoverageRef, ProviderRef, EncounterRef, OrderRef
AuthorizationCase (with status enum, priority enum)
AuthorizationRequirement
Submission, PayerResponse
Task
CallTranscript, ExtractedEvent
Attachment
AuditEvent
All tables include tenantId for row-level tenant isolation. AuditEvent is append-only (no update/delete).

Generate and run initial migration:

npx prisma migrate dev --name init --schema=apps/api/prisma/schema.prisma
Add apps/api/src/lib/prisma.ts — singleton Prisma client (safe for Next.js/Node hot-reload pattern).

Step 2 — Service layer in apps/api/src/services/
Create one service per domain boundary. Each accepts a PrismaClient instance (injected, not imported directly — enables testing).

caseService.ts
createCase(tenantId, data) → creates AuthorizationCase, emits DomainEvents.CASE_CREATED audit event, calls calculateDueAt from @authos/domain
listCases(tenantId, filters) → filtered query (status, assignedTo, q)
getCase(tenantId, id) → single case with requirements, submissions, attachments
updateCaseStatus(tenantId, id, newStatus) → calls assertValidTransition from @authos/domain, emits audit event
assignCase(tenantId, id, userId) → updates assignedTo, emits CASE_ASSIGNED
closeCase(tenantId, id) → transition to closed
requirementsService.ts
discoverRequirements(tenantId, caseId) → calls mock CRD/DTR server (Step 3), persists AuthorizationRequirement rows, transitions case to requirements_found or docs_missing
getRequirements(tenantId, caseId) → list requirements for a case
completeRequirement(tenantId, caseId, reqId, userId) → marks complete, checks if all done → transitions to ready_to_submit
attachmentService.ts
uploadAttachment(tenantId, caseId, file) → write metadata to Attachment table (blob ref = local path for now, swap to S3 later)
listAttachments(tenantId, caseId) → list attachments
classifyAttachment(tenantId, attachmentId) → stub classification (returns document type guess based on filename)
auditService.ts
emit(event) → wraps buildAuditEvent from @authos/audit, persists to AuditEvent table
Implements the AuditEmitter interface from packages/audit
All services reuse types from @authos/shared-types and logic from @authos/domain. No business logic lives in route handlers.

Step 3 — Mock CRD/DTR server (apps/mock-crd/)
New workspace app. Lightweight Express.js server on port 3004.

apps/mock-crd/src/index.ts — two endpoints:

POST /crd/check
Receives a serviceCode + payerId. Returns scripted response:

{
  "authRequired": true,
  "requirements": [
    { "code": "clinical_notes", "description": "Clinical notes from ordering provider", "required": true },
    { "code": "imaging_report", "description": "Recent imaging report (within 6 months)", "required": true },
    { "code": "prior_treatment", "description": "Documentation of prior conservative treatment", "required": false }
  ]
}
Maps service code prefixes to realistic requirement sets (MRI → imaging + clinical notes, PT → prior treatment + diagnosis, surgical → full packet).

POST /dtr/questionnaire
Returns a minimal FHIR Questionnaire resource stub with 2-3 questions matching the service type.

Add apps/mock-crd/package.json and wire into the npm workspace. Add to docker-compose.yml as mock-crd service on port 3004.

Step 4 — Wire API routes to services
Update each route handler in apps/api/src/routes/ to call the appropriate service. Replace all "TODO" stubs.

routes/cases.ts → call caseService.* routes/requirements.ts → call requirementsService.* (which calls mock CRD) routes/attachments.ts → call attachmentService.*

Inject prisma and auditService via a request context (add apps/api/src/lib/context.ts — builds service instances per request using the singleton prisma client).

Step 5 — Document intake UI (/documents route)
Replace the stub with a real screen.

apps/web/src/features/documents/:

containers/DocumentsPageContainer.tsx — server component, fetches attachments across all cases via GET /api/cases + attachment aggregation
presentation/DocumentsPage.tsx — renders attachment table
presentation/DocumentUploadPanel.tsx — client component — drag-and-drop file upload form, calls POST /api/cases/:id/attachments, shows classification result
New organisms:

components/organisms/AttachmentsTable.tsx — columns: file name, case ID, classification, uploaded by, date, status
components/molecules/UploadDropzone.tsx — client component, HTML5 drag-and-drop with file type validation
apps/web/src/app/(dashboard)/documents/page.tsx — replace stub with DocumentsPageContainer.

Step 6 — Unit + integration tests for the service layer
Per testing.md conventions:

apps/api/src/services/caseService.test.ts (integration):

Case creation writes audit event
Status transition rejects invalid paths (via assertValidTransition)
listCases filters by status and tenant
apps/api/src/services/requirementsService.test.ts (integration + contract):

Requirements discovery calls mock CRD and persists rows
Completing all requirements transitions case to ready_to_submit
Mock CRD response shape matches AuthorizationRequirement contract
packages/domain/src/stateMachine.test.ts — already exists, no changes needed.

Use a test Postgres database (separate DATABASE_URL in .env.test) seeded with synthetic fixtures. No real PHI.

Critical files
File	Action
apps/api/prisma/schema.prisma	Create — full entity schema
apps/api/src/lib/prisma.ts	Create — singleton client
apps/api/src/lib/context.ts	Create — per-request service factory
apps/api/src/services/caseService.ts	Create
apps/api/src/services/requirementsService.ts	Create
apps/api/src/services/attachmentService.ts	Create
apps/api/src/services/auditService.ts	Create
apps/api/src/routes/cases.ts	Update — replace stubs
apps/api/src/routes/requirements.ts	Update — replace stubs
apps/api/src/routes/attachments.ts	Update — replace stubs
apps/mock-crd/src/index.ts	Create — new workspace app
apps/mock-crd/package.json	Create
infra/docker/docker-compose.yml	Update — add mock-crd service
apps/web/src/features/documents/	Create — full feature
apps/web/src/app/(dashboard)/documents/page.tsx	Update — replace stub
apps/api/src/services/caseService.test.ts	Create
apps/api/src/services/requirementsService.test.ts	Create
Verification
docker compose -f infra/docker/docker-compose.yml up postgres -d
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma — migration applies clean
npm run dev — all 5 services start (api, web, worker-voice, worker-workflow, mock-crd)
POST /api/cases with valid body → 201, case appears in GET /api/cases
POST /api/cases/:id/check-requirements → requirements rows created, case status transitions
POST /api/cases/:id/attachments with a file → attachment record created
/documents route renders attachment table (no 404, no stub text)
npm test -w apps/api → service tests pass against test database