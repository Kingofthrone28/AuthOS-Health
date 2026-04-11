## Imported guides

- See `./rules/code-style.md` for coding standards, architecture conventions, testing expectations, and code review rules.
- See `./rules/testing.md` for testing conventions, workflow coverage, release gates, and QA expectations.
- See `./rules/dashboard.md` for the Next.js dashboard shell architecture, rendering rules, container/presentation conventions, and PR checklist.
- see `./rules/twilio_voice_transcript.md`for worker WebSocket, streaming speech-to-text, final transcript text

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AuthOS-Health** — SMART-on-FHIR prior-authorization cockpit that uses Voice AI to turn payer calls and clinician dictation into structured auth actions, auto-build documentation packets, track SLA deadlines, and surface denial reasons in one case timeline.

## Resources

> This CLAUDE.md was generated at project initialization. Update it as the codebase evolves with commands, architecture, and conventions.

Primary source document:
- `CLAUDE_global_shell_process_guide_updated.docx`

---

## Product Summary

The product is designed as **one core platform** that supports three launch modes:
- embedded in the EHR
- standalone in the browser
- backend-service automation

The goal of the platform is to centralize prior authorization operations into one system that can:
- detect authorization requirements
- collect and prefill documentation
- submit payer requests
- monitor SLA timelines
- turn payer conversations into structured workflow actions
- support hosted SaaS, single-tenant cloud, and self-hosted deployment models

---

## Main Application: Component Design

The application is split into the following core domains.

### 1. Web App
Owns the user-facing experience.
- auth work queue
- case detail
- manager analytics
- admin and integration settings

### 2. API Gateway / BFF
Owns the UI-facing application boundary.
- tenant-aware auth
- session handling
- API aggregation for UI

### 3. Case Service
Owns authorization workflow state.
- authorization cases
- status timeline
- SLA timers
- assignments
- audit trail

### 4. EHR Integration Service
Owns healthcare system connectivity.
- SMART launch handling
- FHIR reads and writes
- patient, coverage, order, and encounter sync

### 5. Requirements Engine
Owns authorization requirement discovery and documentation logic.
- CRD: determine whether prior auth is required
- DTR: retrieve and prefill documentation requirements
- pre-populate questionnaire and documentation inputs from EHR content

### 6. Submission Service
Owns outbound payer submission workflows.
- build authorization packets
- send PAS, FHIR, or X12 payloads
- store payer responses

### 7. Voice AI Service
Owns voice-driven workflow augmentation.
- telephony integration
- streaming transcription
- event extraction
- draft summaries
- human handoff

### 8. Workflow Orchestrator
Owns asynchronous process execution.
- retries
- escalations
- delayed callbacks
- waiting-on-payer states
- appeal task chains

### 9. Document Service
Owns attachment and intake processing.
- PDF and OCR intake
- attachment classification
- DocumentReference handling

### 10. Analytics Service
Owns management reporting.
- cycle time
- approval rate
- denial trends
- payer bottlenecks

---

## High-Level Component Diagram

```text
[EHR / FHIR Server]
       |
       | SMART / FHIR
       v
+---------------------------+
|   EHR Integration Service |
+---------------------------+
            |
            v
+---------------------------+        +----------------------+
|      API Gateway / BFF    |<------>|   Web App (Next.js) |
+---------------------------+        +----------------------+
            |
   +--------+--------+---------+-------------+
   |                 |         |             |
   v                 v         v             v
+---------+   +-------------+  +-----------+ +----------------+
|  Case   |   | Requirements|  |Submission | | Voice AI       |
| Service |   | Engine      |  | Service   | | Service        |
+---------+   +-------------+  +-----------+ +----------------+
    |               |               |               |
    +-------+-------+-------+-------+---------------+
            |
            v
+---------------------------+
|  Workflow Orchestrator    |
+---------------------------+
            |
            v
+---------------------------+
| Postgres / Redis / Blob   |
| Audit / Metrics / Search  |
+---------------------------+
            |
            v
 [Payers / Portals / APIs / Telephony]
```

---

## Primary Request Flows

### A. Standard Authorization Flow
1. Clinician places an order in the EHR.
2. App launches via SMART EHR launch or standalone launch.
3. EHR Integration Service fetches patient, coverage, diagnosis, order or service request, and encounter context.
4. Requirements Engine determines whether prior auth is required and what documentation is missing.
5. Case Service creates an `AuthorizationCase`.
6. Missing items are surfaced in the dashboard.
7. Voice AI or the clinician adds medical necessity narrative.
8. Submission Service builds the PAS, FHIR, or X12 request.
9. Request is sent to the payer.
10. Workflow Orchestrator monitors status and SLA timers.
11. Voice AI follows up when the case stalls.
12. Approval, denial, or appeal updates the case timeline.

### B. Voice AI Follow-Up Flow
1. Case enters `pending_payer`.
2. Workflow Orchestrator triggers follow-up.
3. Voice AI initiates or joins a call.
4. Transcript streams in real time.
5. Structured facts are extracted, including:
   - reference number
   - current status
   - missing documents
   - denial reason
   - peer review requirement
   - callback deadline
6. Confidence scoring is applied.
7. Low-confidence output is routed to human review.
8. Approved extraction updates the `AuthorizationCase`.
9. New tasks are created automatically.

---

## Core Dashboard Screens

### Work Queue
- new
- docs missing
- ready to submit
- submitted
- pending payer
- more info requested
- denied / appeal
- nearing SLA breach

### Case Detail
- patient snapshot
- insurance and plan snapshot
- ordered service
- authorization state timeline
- payer documentation checklist
- voice transcript and extracted events
- attachments
- denial reasons
- next best action
- full audit log

### Manager View
- average turnaround time
- expedited vs standard aging
- approval and denial rate
- top denial reasons
- payer response lag
- staff touch count per case

---

## Recommended Data Model

Use a canonical internal schema and map to FHIR as needed.

### Core Entities
- Tenant
- User
- Role
- PatientRef
- CoverageRef
- ProviderRef
- EncounterRef
- OrderRef

### Workflow Entities
- AuthorizationCase
- AuthorizationRequirement
- Submission
- PayerResponse
- Task
- CallTranscript
- ExtractedEvent
- Attachment
- AuditEvent

### AuthorizationCase Fields
- id
- tenant_id
- patient_ref
- coverage_ref
- service_type
- priority
- status
- payer_name
- due_at
- created_by
- assigned_to

### State Machine
```text
new
-> requirements_found
-> docs_missing
-> ready_to_submit
-> submitted
-> pending_payer
-> more_info_requested
-> peer_review_needed
-> approved
-> denied
-> appealed
-> closed
```

---

## API Surface

### Auth / Launch
- `GET /smart/launch/ehr`
- `GET /smart/launch/standalone`
- `POST /auth/backend/token`

### Cases
- `POST /cases`
- `GET /cases`
- `GET /cases/:id`
- `PATCH /cases/:id`
- `POST /cases/:id/assign`
- `POST /cases/:id/close`

### Requirements
- `POST /cases/:id/check-requirements`
- `GET /cases/:id/requirements`
- `POST /cases/:id/requirements/:reqId/complete`

### Submission
- `POST /cases/:id/build-submission`
- `POST /cases/:id/submit`
- `GET /cases/:id/submissions`
- `POST /cases/:id/resubmit`

### Voice AI
- `POST /cases/:id/calls/start`
- `POST /voice/webhooks/transcript`
- `POST /voice/webhooks/event-extraction`
- `POST /cases/:id/calls/:callId/review`

### Documents
- `POST /cases/:id/attachments`
- `GET /cases/:id/attachments`
- `POST /cases/:id/attachments/classify`

### Tasks / Workflow
- `GET /tasks`
- `POST /tasks/:id/complete`
- `POST /cases/:id/escalate`

### Analytics
- `GET /analytics/turnaround`
- `GET /analytics/denials`
- `GET /analytics/payers`
- `GET /analytics/staff`

---

## SaaS and Deployment Architecture

### A. Multi-Tenant SaaS
Best for:
- small to mid provider organizations
- fastest rollout
- easiest upgrades

Characteristics:
- shared control plane
- shared app runtime
- row-level or schema-level tenant isolation
- tenant-scoped encryption and secrets
- per-tenant EHR and payer configuration

### B. Single-Tenant Managed Cloud
Best for:
- hospitals
- IDNs
- security-conscious buyers

Characteristics:
- dedicated web, API, and worker pods per customer
- dedicated Postgres, Redis, and object storage
- private connectivity to EHR and payer endpoints
- same product codebase with stronger isolation

### C. Self-Hosted / Private Cloud
Best for:
- strict enterprise buyers
- private-cloud mandates
- limited shared-hosting tolerance

Characteristics:
- Kubernetes-based deployment
- Helm chart packaging
- customer-managed secrets and storage
- migration jobs, health checks, and readiness probes

### What Changes Between SaaS and Self-Hosted

#### Same
- frontend app
- API contracts
- workflow definitions
- core DB schema
- voice event model
- business logic
- audit model

#### Different
- identity provider
- network topology
- secrets management
- storage endpoints
- observability wiring
- disaster recovery process
- deployment automation

---

## Security Baseline

Every deployment model must include:
- tenant-aware RBAC
- SSO / SAML / OIDC support
- audit logging for every auth case change
- encryption at rest and in transit
- configurable retention
- PHI-scoped access rules
- confidence-based human review for AI outputs
- immutable payer interaction logs
- BAA-ready infrastructure vendors

---

## Engineering Packaging Strategy

Build one repo and package it three ways.

### Applications
```text
/apps/web              — Next.js dashboard (TypeScript)
/apps/api              — API Gateway / BFF (TypeScript)
/apps/worker-voice     — Voice AI webhook worker (Express.js / TypeScript)
/apps/worker-workflow  — Workflow orchestrator worker (TypeScript)
```

All four apps are TypeScript. `worker-voice` uses Express.js (not Python) because transcription and extraction are API-driven (e.g., Deepgram, Claude). This keeps the monorepo uniform and allows workers to import directly from shared packages without a schema bridge.

### Shared Packages
```text
/packages/domain         — state machine, SLA logic, policy rules (no external deps)
/packages/shared-types   — AuthorizationCase, all entity interfaces, shared enums
/packages/audit          — AuditEvent schema and emitter interface
/packages/fhir-adapters  — SMART launch, FHIR reads/writes
/packages/payer-adapters — PAS/X12/FHIR submission builders, response parsers
/packages/voice-adapters — telephony hook types, transcript stream interface, extraction payload types (TypeScript — imported directly by worker-voice)
```

### Ship Targets
- hosted SaaS
- single-tenant managed cloud
- self-hosted Helm deployment

---

## Monorepo Structure

```text
repo/
├─ apps/
│  ├─ web/
│  ├─ api/
│  ├─ worker-voice/
│  └─ worker-workflow/
├─ packages/
│  ├─ domain/
│  ├─ fhir-adapters/
│  ├─ payer-adapters/
│  ├─ voice-adapters/
│  ├─ shared-types/
│  └─ audit/
├─ infra/
│  ├─ helm/
│  ├─ terraform/
│  ├─ docker/
│  └─ github-actions/
└─ docs/
   ├─ architecture/
   ├─ api/
   ├─ security/
   └─ onboarding/
```

---

## Recommended Build Order

### Phase 1
- case dashboard
- work queue
- auth timeline
- transcript ingestion
- manual task engine

### Phase 2
- SMART standalone and EHR launch
- FHIR data sync
- CRD and DTR integration
- document intake

### Phase 3
- PAS submission
- payer adapters
- automated follow-up
- denial analytics

### Phase 4
- multi-tenant hardening
- single-tenant templates
- self-hosted packaging
- enterprise SSO and audit exports

---

## Working Conventions for Claude

When editing this repository:
1. Preserve the platform boundary between app code, adapters, and infrastructure.
2. Prefer additive documentation changes over destructive rewrites.
3. Keep shared interfaces in `/packages/shared-types` when multiple apps depend on them.
4. Keep domain workflow logic in `/packages/domain`, not inside UI routes.
5. Keep deployment-specific concerns in `/infra`, not in application business logic.
6. Treat healthcare integrations as adapter-driven and tenant-aware.
7. Keep all architecture docs aligned with the latest monorepo structure and deployment model.

---

## Documentation Maintenance Rules

Update this file when any of the following change:
- launch modes
- core services
- API surface
- monorepo layout
- deployment targets
- security model
- build phases
- package ownership boundaries

When updating, prefer:
- clear headings
- short bullet lists
- concrete ownership boundaries
- diagrams that match the current repository
