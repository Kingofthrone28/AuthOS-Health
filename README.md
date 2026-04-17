# AuthOS-Health

SMART-on-FHIR prior authorization cockpit. Turns payer calls and clinician dictation into structured auth actions, auto-builds documentation packets, tracks SLA deadlines, and surfaces denial reasons — all in one case timeline.

Supports three launch modes: embedded in an EHR, standalone browser, and backend-service automation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Monorepo Structure](#monorepo-structure)
- [Applications](#applications)
  - [Web Dashboard](#web-dashboard-appswebsrc)
  - [API Gateway / BFF](#api-gateway--bff-appsapisrc)
  - [Worker: Voice AI](#worker-voice-ai-appsworker-voicesrc)
  - [Worker: Workflow](#worker-workflow-appsworker-workflowsrc)
  - [Mock Services](#mock-services)
- [Shared Packages](#shared-packages)
- [Data Model](#data-model)
- [Authorization Case State Machine](#authorization-case-state-machine)
- [Core Request Flows](#core-request-flows)
- [Service Port Reference](#service-port-reference)
- [Local Development](#local-development)
- [Deployment Modes](#deployment-modes)
- [Security Model](#security-model)

---

## Architecture Overview

```
[EHR / FHIR Server]
       │
       │ SMART / FHIR R4
       ▼
┌─────────────────────────┐
│  EHR Integration Service│  (mock-fhir in dev, real PKCE in prod)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐        ┌──────────────────────┐
│   API Gateway / BFF     │◄──────►│  Web App (Next.js)   │
│   apps/api  :3001       │        │  apps/web  :3000     │
└─────────────────────────┘        └──────────────────────┘
            │
   ┌────────┼──────────────┬──────────────┐
   ▼        ▼              ▼              ▼
Case     Requirements   Submission     Voice AI
Service   Engine        Service        Service
   │        │              │              │
   └────────┴──────────────┴──────────────┘
                     │
            ┌────────┴────────┐
            ▼                 ▼
   Workflow Orchestrator    Document Service
   worker-workflow :3003    (attachment intake)
            │
            ▼
┌──────────────────────────┐
│ Postgres / Redis / Blob  │
│ Audit / Metrics          │
└──────────────────────────┘
            │
            ▼
  [Payers / Portals / Telephony]
```

---

## Monorepo Structure

```
authos-health/
├── apps/
│   ├── web/               Next.js 14 dashboard (App Router, TypeScript)
│   ├── api/               API Gateway / BFF (Express.js, TypeScript)
│   ├── worker-voice/      Voice AI webhook worker (Express.js, TypeScript)
│   ├── worker-workflow/   Workflow orchestrator — SLA, escalation, retry
│   ├── mock-crd/          Mock CRD server — auth requirement discovery (port 3004)
│   ├── mock-fhir/         Mock FHIR R4 server — patient/coverage/orders (port 3005)
│   └── mock-payer/        Mock payer adapter — submission responses (port 3006)
│
├── packages/
│   ├── shared-types/      All entity interfaces, enums, and DTOs
│   ├── domain/            State machine, SLA logic, voice policy (zero external deps)
│   ├── audit/             AuditEvent schema and AuditEmitter interface
│   ├── fhir-adapters/     SMART launch, FHIR R4 mappers
│   ├── payer-adapters/    PAS/X12/portal submission builders and response parsers
│   └── voice-adapters/    Telephony webhook types and transcript stream interface
│
├── infra/
│   ├── docker/            Dockerfiles + docker-compose (dev and single-tenant)
│   ├── helm/              Self-hosted Kubernetes chart
│   ├── terraform/         Cloud infrastructure
│   └── github-actions/    CI pipeline
│
└── docs/
    ├── architecture/      ADRs and component diagrams
    ├── api/               OpenAPI spec and endpoint guides
    ├── security/          Tenant isolation, PHI handling, RBAC
    └── onboarding/        Local dev setup and service port reference
```

---

## Applications

### Web Dashboard (`apps/web/src`)

Next.js 14 App Router. Server Components by default. Client Components only for interactivity.

**Routes**

| Route | Description |
|---|---|
| `/dashboard` | Work queue with SLA-aware case list and status filters |
| `/cases/[id]` | Full case detail — patient, insurance, requirements, submissions, voice, tasks |
| `/documents` | Cross-case attachment table with drag-and-drop upload |
| `/voice` | Live transcript feed, extracted event review queue, voice stats |
| `/analytics` | Turnaround time, approval/denial rates, payer bottlenecks |
| `/settings` | Tenant config, SSO setup, integration settings |

**Feature directories follow container/presentation pattern:**

```
apps/web/src/features/
├── dashboard/
│   ├── containers/DashboardPageContainer.tsx   ← fetches data, builds view model
│   └── presentation/DashboardPage.tsx          ← renders props only
├── case-detail/
│   ├── containers/CaseDetailContainer.tsx
│   ├── presentation/CaseDetailPage.tsx
│   ├── mappers.ts                              ← API response → view model
│   └── types.ts                               ← CaseDetailViewModel and friends
├── voice/
├── documents/
├── analytics/
└── settings/
```

**Component library (`apps/web/src/components/`)**

| Layer | Examples |
|---|---|
| Atoms | `Button`, `Badge`, `Card`, `DetailRow` |
| Molecules | `CaseStatusBar`, `CheckRequirementsButton`, `SubmitToPayerButton`, `CaseUploadButton`, `CompleteRequirementButton` |
| Organisms | `Sidebar`, `TopBar`, `CasesTable`, `RequirementsChecklist`, `CaseTaskList`, `CaseAttachmentsList`, `SubmissionsTimeline`, `ApprovalPanel`, `DenialReasonPanel` |

**Key rule:** `RequirementsChecklist` and `CaseTaskList` both suppress entirely for terminal statuses (`approved`, `denied`, `closed`). Action buttons in the checklist only render for active statuses (`requirements_found`, `docs_missing`, `more_info_requested`, `ready_to_submit`).

---

### API Gateway / BFF (`apps/api/src`)

Express.js on port 3001. All business logic lives in service classes. Route handlers parse and delegate only.

**Entry point:** [`apps/api/src/index.ts`](apps/api/src/index.ts)

**Route groups**

| Prefix | File | Description |
|---|---|---|
| `/auth` | `routes/auth.ts` | Credentials login, OIDC/SSO callback, token issuance |
| `/smart` | `routes/smart.ts` | SMART EHR and standalone launch → auto-create case |
| `/api/cases` | `routes/cases.ts` | Case CRUD, status patch, assign, close, escalate |
| `/api/cases/:id` | `routes/requirements.ts` | Check requirements, list, complete |
| `/api/cases/:id` | `routes/submissions.ts` | Build packet, submit, resubmit, list |
| `/api/cases/:id` | `routes/attachments.ts` | Upload, list, classify |
| `/api/voice` | `routes/voice.ts` | Transcript persistence, extracted events, review |
| `/api/tasks` | `routes/tasks.ts` | List and complete workflow tasks |
| `/api/analytics` | `routes/analytics.ts` | Turnaround, denials, payer, staff metrics |
| `/api/documents` | `routes/documents.ts` | Cross-case document aggregation |
| `/api/audit` | `routes/audit.ts` | Audit event export |
| `/api/tenants` | `routes/tenants.ts` | Tenant config and SSO settings |

**Service layer (`apps/api/src/services/`)**

| Service | Responsibility |
|---|---|
| `caseService.ts` | Create, list, get, update status, assign, close. Enforces state machine via `assertValidTransition`. |
| `requirementsService.ts` | Calls mock CRD, persists requirements, closes review tasks, auto-transitions to `ready_to_submit` when all required items are complete. |
| `submissionService.ts` | Builds submission packets via `payer-adapters`, sends to payer, maps decision to next case status. |
| `voiceService.ts` | Persists `CallTranscript` and `ExtractedEvent` rows, routes low-confidence events to review queue, auto-applies safe high-confidence events. |
| `attachmentService.ts` | Writes attachment metadata, stores binary to local disk (swap to S3 in prod). |
| `analyticsService.ts` | Aggregates turnaround, denial trends, payer response lag, and staff touch counts. |
| `ehrService.ts` | Fetches Patient/Coverage/ServiceRequest from FHIR, upserts `PatientRef`/`CoverageRef`/`OrderRef`. |
| `auditService.ts` | Wraps `buildAuditEvent`, persists to append-only `AuditEvent` table. |
| `taskService.ts` | List open tasks, complete tasks. |
| `tenantService.ts` | Tenant and SSO settings management. |

**Auth middleware (`apps/api/src/middleware/tenantAuth.ts`)**

Supports three call patterns:
- **Bearer JWT** — validates and extracts `tenantId`, `userId`, `role` from claims
- **OIDC/SAML SSO** — verifies against tenant's configured JWKS endpoint
- **Internal secret** — workers pass `x-internal-secret` header for system calls

---

### Worker: Voice AI (`apps/worker-voice/src`)

Express.js on port 3002. Receives webhook payloads from telephony providers and runs Claude extraction.

**Entry point:** [`apps/worker-voice/src/index.ts`](apps/worker-voice/src/index.ts)

```
POST /voice/webhooks/transcript       ← receives completed call transcript
POST /voice/webhooks/event-extraction ← receives raw extracted events
```

**Flow:**
1. Transcript arrives from telephony provider (Twilio, etc.)
2. `extractionService.ts` calls Claude (`claude-sonnet-4-6`) with `extract_authorization_events` tool
3. Returns `RawExtractedEvent[]` — reference numbers, status, denial reasons, missing docs, callback deadlines
4. Posts transcript + events to API for persistence and review routing

**Extraction confidence policy** (defined in `packages/domain/src/voicePolicy.ts`):
- Confidence ≥ 0.75 + safe event type → auto-applied
- Confidence < 0.75 or irreversible event type → routed to human review queue

---

### Worker: Workflow (`apps/worker-workflow/src`)

Express.js on port 3003. Owns SLA timers, escalation chains, and retry logic.

**Entry point:** [`apps/worker-workflow/src/index.ts`](apps/worker-workflow/src/index.ts)

```
POST /triggers/sla-check    ← scan cases nearing or past SLA deadlines
POST /triggers/escalation   ← escalate stalled cases
POST /triggers/retry        ← retry failed submission attempts
```

Trigger endpoints are called by a job scheduler (cron, BullMQ, or Temporal). Processors live in `apps/worker-workflow/src/processors/`.

---

### Mock Services

Used in local development and CI. Same port layout carries over to Docker Compose.

| Service | Port | Purpose |
|---|---|---|
| `mock-crd` | 3004 | `POST /crd/check` — returns auth requirements by service code prefix |
| `mock-fhir` | 3005 | `GET /fhir/Patient/:id`, `/fhir/Coverage`, `/fhir/ServiceRequest` |
| `mock-payer` | 3006 | Simulates payer submission responses (approved/denied/pending/more_info) |

**CRD requirement rules** (`apps/mock-crd/src/index.ts`):

```
MRI       → clinical notes + ICD-10 codes (imaging report optional)
CT        → clinical notes + ICD-10 codes
PT        → prior conservative treatment + ICD-10 codes
FUSION    → surgical consult + imaging + prior treatment + ICD-10 + operative plan
ARTHROSCOPY → ortho consult + imaging + prior treatment
CHEMO     → pathology report + treatment plan + staging report
CATH      → cardiology consult + stress test + ICD-10 codes
DEFAULT   → clinical notes + ICD-10 codes
```

---

## Shared Packages

### `packages/shared-types`

Single source of truth for all entity interfaces, enums, and DTOs. Every app imports from here — no schema bridges.

Key exports: `AuthorizationCase`, `AuthorizationCaseStatus`, `CasePriority`, `ExtractedEvent`, `ExtractedEventType`, `PatientRef`, `CoverageRef`, `AuditEvent`.

### `packages/domain`

Zero external runtime dependencies. Contains only pure business logic.

| File | Contents |
|---|---|
| `stateMachine.ts` | `assertValidTransition`, `allowedTransitions`, `TRANSITIONS` map |
| `sla.ts` | `calculateDueAt`, `isBreached`, `hoursRemaining`, `isNearingBreach` |
| `voicePolicy.ts` | `requiresHumanReview`, `AUTO_APPLY_EVENT_TYPES`, `HUMAN_REVIEW_THRESHOLD` (0.75) |
| `events.ts` | `DomainEvents` constants — all event names as typed strings |

### `packages/audit`

`AuditEmitter` interface and `buildAuditEvent` factory. Every case mutation emits an `AuditEvent` via this package.

### `packages/payer-adapters`

`PayerAdapter` interface, `SubmissionPacket` type, and mock/portal adapter implementations. `submissionService.ts` calls `getPayerAdapter(payerId)` to route to the right adapter.

### `packages/fhir-adapters`

SMART launch helpers and FHIR R4 mappers. `ehrService.ts` uses these to map FHIR `Patient`/`Coverage`/`ServiceRequest` resources to internal `PatientRef`/`CoverageRef`/`OrderRef` rows.

### `packages/voice-adapters`

`TranscriptWebhookPayload`, `RawExtractedEvent`, and `TelephonyAdapter` interface. `worker-voice` imports these directly — no schema bridge required.

---

## Data Model

Managed by Prisma ORM. Schema at [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).

All tables include `tenantId` for row-level tenant isolation.

**Core entities**

| Table | Description |
|---|---|
| `Tenant` | Org record — slug, name, deployment mode |
| `TenantSettings` | SSO provider, OIDC config per tenant |
| `User` | Auth user with role (`admin`, `coordinator`, `reviewer`, `viewer`) |
| `PatientRef` | Canonical patient reference, keyed by `fhirId` |
| `CoverageRef` | Insurance plan — payer, plan name, member ID, group ID |
| `OrderRef` | Clinical order — service type, service code, ordering provider |

**Workflow entities**

| Table | Description |
|---|---|
| `AuthorizationCase` | Central case record — status, priority, payer, SLA deadline |
| `AuthorizationRequirement` | Per-case documentation checklist item — required, completed, source |
| `Submission` | Outbound payer request — protocol, status, timestamps |
| `PayerResponse` | Payer decision — approved/denied/pending, auth number, denial code |
| `Task` | Workflow action item — type, assignee, due date, completedAt |
| `CallTranscript` | Voice call record — transcript text, duration, call SID |
| `ExtractedEvent` | AI-extracted fact — type, value, confidence, review status |
| `Attachment` | Uploaded document — file name, MIME type, classification, blob ref |
| `AuditEvent` | Append-only immutable log — entity, action, actor, before/after |

---

## Authorization Case State Machine

Defined in [`packages/domain/src/stateMachine.ts`](packages/domain/src/stateMachine.ts).

```
new
 ├─► requirements_found
 │    ├─► docs_missing
 │    │    └─► ready_to_submit ◄─── more_info_requested
 │    └─► ready_to_submit
 │         └─► submitted
 │              ├─► pending_payer
 │              │    ├─► more_info_requested
 │              │    ├─► peer_review_needed
 │              │    ├─► approved
 │              │    └─► denied
 │              ├─► approved
 │              └─► denied
 │                   └─► appealed
 │                        └─► submitted (loop)
 └─► closed  (reachable from any state)
```

Every status change goes through `assertValidTransition` — invalid paths throw `InvalidTransitionError` and are rejected by the API.

---

## Core Request Flows

### Standard Authorization Flow

```
1. Clinician places order in EHR
2. App launches via SMART (GET /smart/launch/ehr?iss=&patient=)
3. ehrService fetches Patient, Coverage, ServiceRequest from FHIR
4. Case created at status: new
5. User clicks "Check Requirements" → POST /api/cases/:id/check-requirements
6. requirementsService calls mock-crd → returns requirement list
7. Case transitions: new → requirements_found or docs_missing
8. User uploads docs per requirement → each auto-completes that row
9. All required items done → case transitions to ready_to_submit
10. User clicks "Submit to Payer" → POST /api/cases/:id/submit
11. submissionService builds packet, sends to payer adapter
12. Payer response → case transitions to approved / denied / pending_payer
```

### Voice AI Flow

```
1. Payer call completes
2. Transcript webhook → POST /voice/webhooks/transcript
3. worker-voice calls Claude extraction (extract_authorization_events tool)
4. Extracted events posted → POST /voice/webhooks/event-extraction
5. voiceService routes events:
   - confidence ≥ 0.75 + safe type → auto-applied to case
   - confidence < 0.75 or irreversible → pending review queue
6. Reviewer approves/rejects in /voice dashboard
7. Approved events update the AuthorizationCase
```

### Workflow Orchestration Flow

```
1. worker-workflow runs on cron schedule
2. POST /triggers/sla-check → finds cases nearing/past deadline → emits SLA events
3. POST /triggers/escalation → escalates stalled cases → creates escalation tasks
4. POST /triggers/retry → retries failed payer submissions
```

---

## Service Port Reference

| Service | Port | Notes |
|---|---|---|
| `apps/web` | 3000 | Next.js dev server |
| `apps/api` | 3001 | Express API — primary backend |
| `apps/worker-voice` | 3002 | Voice webhook receiver |
| `apps/worker-workflow` | 3003 | Workflow trigger endpoints |
| `apps/mock-crd` | 3004 | CRD requirement discovery |
| `apps/mock-fhir` | 3005 | FHIR R4 patient/coverage/orders |
| `apps/mock-payer` | 3006 | Payer submission mock |
| Postgres | 5432 | Primary database |
| Redis | 6379 | Queue / cache |

---

## Local Development

**Prerequisites:** Node.js ≥ 20, Docker, npm ≥ 10

**1. Start infrastructure**

```bash
docker compose -f infra/docker/docker-compose.yml up postgres redis -d
```

**2. Install dependencies**

```bash
npm install
```

**3. Run database migrations**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

**4. Bootstrap dev tenant and seed data**

```bash
TENANT_MODE=single TENANT_NAME="Dev Org" TENANT_SLUG=dev \
ADMIN_EMAIL=admin@dev.local ADMIN_PASSWORD=password \
npx tsx apps/api/src/scripts/bootstrap-tenant.ts

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
npx tsx apps/api/src/scripts/seed-sample-data.ts
```

**5. Start all services**

```bash
npm run dev
```

Or start individually:

```bash
npm run dev -w apps/api
npm run dev -w apps/web
npm run dev -w apps/worker-voice
npm run dev -w apps/worker-workflow
npm run dev -w apps/mock-crd
```

**6. Open the dashboard**

```
http://localhost:3000
```

Login with `admin@dev.local` / `password` and tenant slug `dev`.

**Useful database commands**

```bash
# List all tables
docker exec docker-postgres-1 psql -U postgres -d authos_health -c "\dt"

# Query a table
docker exec docker-postgres-1 psql -U postgres -d authos_health \
  -c "SELECT id, status, \"serviceType\" FROM \"AuthorizationCase\" LIMIT 10;"

# Reset a test patient for flow testing
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
npx tsx apps/api/src/scripts/reset-emily-carter.ts

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/authos_health \
npx tsx apps/api/src/scripts/reset-linda-nguyen.ts
```

**Other commands**

```bash
npm run build          # build all apps and packages
npm run type-check     # TypeScript check across monorepo
npm run lint           # ESLint across monorepo
npm test               # run all tests
npm test -w apps/api   # test a single workspace
```

---

## Deployment Modes

### Shared SaaS (multi-tenant)

Row-level tenant isolation. Shared app runtime, shared Postgres with `tenantId` scoping on every query. Fastest rollout, easiest upgrades.

### Single-Tenant Managed Cloud

Dedicated pods and dedicated database per customer. Stronger isolation for hospitals and IDNs.

```bash
cp infra/docker/single-tenant.env.example .env
# edit .env
docker compose -f infra/docker/docker-compose.single-tenant.yml up -d
```

The API auto-provisions the tenant on first boot when `TENANT_MODE=single`.

### Self-Hosted / Private Cloud

Kubernetes deployment via Helm chart at `infra/helm/`. Customer-managed secrets, storage, and networking.

**What changes between modes:**

| Same across all modes | Changes per mode |
|---|---|
| Frontend app | Identity provider |
| API contracts | Network topology |
| Workflow definitions | Secrets management |
| Core DB schema | Storage endpoints |
| Voice event model | Observability wiring |
| Business logic | Disaster recovery |
| Audit model | Deployment automation |

---

## Security Model

- **Tenant isolation:** `tenantId` on every DB row, enforced in all service queries
- **Auth:** JWT (credentials login) + OIDC/SAML SSO per tenant via `tenantAuth` middleware
- **RBAC:** `admin`, `coordinator`, `reviewer`, `viewer` roles enforced at API layer
- **PHI:** No PHI in logs. Synthetic data in seeds and tests. Server-side data fetching keeps PHI off client.
- **AI safety:** Voice extraction confidence threshold (0.75). Unreviewed AI output never directly mutates irreversible case state.
- **Audit:** Every case mutation emits an append-only `AuditEvent` via `packages/audit`. Immutable — no update or delete.
- **Encryption:** At rest and in transit. BAA-ready infrastructure vendors assumed.
- **Attachments:** Binary uploads stored server-side (local disk in dev, swap to S3/GCS in prod via `attachmentService.ts`).
