# System Design Overview

Client-friendly ASCII view of the AuthOS Health platform as it exists today.

## 1. End-to-End System

```text
                                 +----------------------+
                                 |   Clinician / Staff  |
                                 |   Browser Session    |
                                 +----------+-----------+
                                            |
                                            | HTTPS
                                            v
                                +-----------+-----------+
                                |  Web App / Dashboard  |
                                |  Next.js 14           |
                                |  Port 3000            |
                                +-----------+-----------+
                                            |
                    +-----------------------+------------------------+
                    |                                                |
                    | Session auth, page requests, actions           | Uploads, workflow actions,
                    |                                                | review decisions
                    v                                                v
                         +-------------------------------+
                         |      API Gateway / BFF        |
                         |      Express + TypeScript     |
                         |      Port 3001               |
                         +---------------+---------------+
                                         |
             +---------------------------+-----------------------------+
             |                |                 |                      |
             |                |                 |                      |
             v                v                 v                      v
    +--------+------+ +-------+-------+ +-------+--------+   +---------+--------+
    | Case Service  | | Requirements  | | Submission     |   | Voice Service    |
    |               | | Service       | | Service        |   |                  |
    +--------+------+ +-------+-------+ +-------+--------+   +---------+--------+
             |                |                 |                      |
             +----------------+-----------------+----------------------+
                                         |
                                         v
                           +-------------+-------------+
                           |   Shared Data Layer       |
                           |   PostgreSQL              |
                           |   Port 5432              |
                           +-------------+-------------+
                                         |
                                         |
                         +---------------+-------------------+
                         |                                   |
                         v                                   v
               +---------+---------+               +---------+---------+
               |   Redis / Queue   |               | Attachment Storage|
               |   Port 6379       |               | local disk in dev |
               +-------------------+               +-------------------+


      External Systems and Automation
      -------------------------------

   +-------------------+      +-------------------+      +-------------------+
   |  EHR / FHIR       |      |  Payer Systems    |      | Telephony / STT   |
   |  SMART launch     |      | PAS / portals     |      | transcript source |
   +---------+---------+      +---------+---------+      +---------+---------+
             |                          |                          |
             v                          v                          v
   +---------+---------+      +---------+---------+      +---------+---------+
   | Mock FHIR / FHIR  |      | Mock Payer /      |      | Worker: Voice AI  |
   | integration path  |      | payer adapters    |      | Port 3002         |
   | Port 3005 in dev  |      | Port 3006 in dev  |      +---------+---------+
   +-------------------+      +-------------------+                |
                                                                   |
                                                                   v
                                                         +---------+---------+
                                                         | API Voice Routes  |
                                                         | transcript/events |
                                                         +-------------------+


   +-------------------+
   | Worker: Workflow  |
   | SLA / escalation  |
   | Port 3003         |
   +---------+---------+
             |
             v
   +---------+---------+
   | API + Postgres    |
   | tasks, status,    |
   | retries, audit    |
   +-------------------+
```

## 2. What Each Part Does

```text
Browser / Web App
  - user login
  - dashboard views
  - case work queue
  - document upload
  - voice review queue
  - settings and analytics

API Gateway / BFF
  - single backend entry point for the web app
  - authentication and tenant scoping
  - business rules and state transitions
  - persistence and audit events

PostgreSQL
  - source of truth for tenants, users, cases, requirements,
    tasks, attachments, transcripts, extracted events, and audit history

Worker: Voice AI
  - receives transcript webhooks
  - extracts structured prior-auth facts
  - forwards transcript and extracted events to the API

Worker: Workflow
  - background automation
  - SLA timers, escalations, retries, orchestration

External Integrations
  - EHR / SMART-on-FHIR
  - payer systems
  - telephony / speech-to-text
```

## 3. Primary Business Flows

### A. Standard User Workflow

```text
User
  -> Web App
  -> API
  -> Postgres
  -> API returns typed view models
  -> Web App renders dashboard, case detail, documents, voice, analytics
```

### B. New Authorization Case from EHR

```text
EHR / SMART launch
  -> API SMART route
  -> FHIR integration service / mock FHIR
  -> patient + coverage + order references created
  -> authorization case created
  -> case appears in dashboard
```

### C. Requirements Discovery

```text
Case selected
  -> API requirements service
  -> CRD / rules source
  -> required documents and tasks persisted
  -> user completes checklist
  -> case can move toward ready_to_submit
```

### D. Submission to Payer

```text
Ready case
  -> submission service
  -> payer adapter / mock payer
  -> payer response stored
  -> case status updated
  -> timeline and analytics updated
```

### E. Voice Intake and Review

```text
Phone call / transcript provider
  -> Worker: Voice AI
  -> transcript saved to API
  -> AI extracts structured events
  -> API stores events
  -> high-confidence safe events may auto-apply
  -> low-confidence or sensitive events go to human review queue
  -> user reviews in dashboard
```

## 4. Security and Isolation Model

```text
Users log in
  -> session created in web app
  -> API requests include tenant context
  -> backend enforces tenant isolation
  -> each tenant only sees its own users, cases, documents, and events

Audit trail
  -> major actions emit audit events
  -> supports reviewability and operational traceability
```

## 5. Development / Demo Topology

```text
Port 3000  -> Web App
Port 3001  -> API Gateway / BFF
Port 3002  -> Voice Worker
Port 3003  -> Workflow Worker
Port 3004  -> Mock CRD
Port 3005  -> Mock FHIR
Port 3006  -> Mock Payer
Port 5432  -> PostgreSQL
Port 6379  -> Redis
```

## 6. Monorepo Structure with Example Files

```text
authos-health/
|
+-- apps/
|   |
|   +-- web/
|   |   |
|   |   +-- src/app/
|   |   |   +-- login/page.tsx
|   |   |   +-- (dashboard)/dashboard/page.tsx
|   |   |   +-- (dashboard)/cases/page.tsx
|   |   |   +-- (dashboard)/documents/page.tsx
|   |   |   +-- (dashboard)/voice/page.tsx
|   |   |   +-- auth/sso-callback/page.tsx
|   |   |
|   |   +-- src/features/
|   |   |   +-- dashboard/containers/DashboardPageContainer.tsx
|   |   |   +-- case-detail/containers/CaseDetailContainer.tsx
|   |   |   +-- documents/presentation/UploadPanel.tsx
|   |   |   +-- voice/containers/VoicePageContainer.tsx
|   |   |   +-- voice/presentation/ReviewQueue.tsx
|   |   |
|   |   +-- src/lib/
|   |   |   +-- api/client.ts
|   |   |   +-- auth.ts
|   |   |   +-- session.ts
|   |   |
|   |   +-- src/components/
|   |       +-- organisms/TopBar.tsx
|   |       +-- organisms/Sidebar.tsx
|   |       +-- molecules/CaseUploadButton.tsx
|   |
|   +-- api/
|   |   |
|   |   +-- src/index.ts
|   |   +-- src/lib/context.ts
|   |   +-- src/lib/prisma.ts
|   |   +-- src/middleware/tenantAuth.ts
|   |   +-- src/routes/auth.ts
|   |   +-- src/routes/cases.ts
|   |   +-- src/routes/requirements.ts
|   |   +-- src/routes/submissions.ts
|   |   +-- src/routes/attachments.ts
|   |   +-- src/routes/voice.ts
|   |   +-- src/routes/smart.ts
|   |   +-- src/services/caseService.ts
|   |   +-- src/services/requirementsService.ts
|   |   +-- src/services/submissionService.ts
|   |   +-- src/services/attachmentService.ts
|   |   +-- src/services/voiceService.ts
|   |   +-- src/services/ehrService.ts
|   |   +-- src/services/analyticsService.ts
|   |   +-- src/scripts/bootstrap-tenant.ts
|   |   +-- src/scripts/seed-sample-data.ts
|   |   +-- prisma/schema.prisma
|   |
|   +-- worker-voice/
|   |   +-- src/index.ts
|   |   +-- src/routes/transcript.ts
|   |   +-- src/routes/extraction.ts
|   |   +-- src/routes/twilioMedia.ts
|   |   +-- src/services/transcriptPipeline.ts
|   |   +-- src/services/extractionService.ts
|   |   +-- src/services/sttClient.ts
|   |
|   +-- worker-workflow/
|   |   +-- src/index.ts
|   |   +-- src/lib/apiClient.ts
|   |   +-- src/processors/slaProcessor.ts
|   |   +-- src/processors/escalationProcessor.ts
|   |   +-- src/processors/retryProcessor.ts
|   |
|   +-- mock-crd/
|   +-- mock-fhir/
|   +-- mock-payer/
|
+-- packages/
|   |
|   +-- shared-types/
|   |   +-- src/index.ts
|   |   +-- src/case.ts
|   |   +-- src/entities.ts
|   |   +-- src/voice.ts
|   |   +-- src/audit.ts
|   |
|   +-- domain/
|   |   +-- src/index.ts
|   |   +-- src/stateMachine.ts
|   |   +-- src/sla.ts
|   |   +-- src/voicePolicy.ts
|   |   +-- src/events.ts
|   |
|   +-- fhir-adapters/
|   |   +-- src/index.ts
|   |   +-- src/mappers.ts
|   |   +-- src/types.ts
|   |
|   +-- payer-adapters/
|   |   +-- src/factory.ts
|   |   +-- src/types.ts
|   |   +-- src/adapters/mockPayerAdapter.ts
|   |   +-- src/adapters/pasAdapter.ts
|   |
|   +-- voice-adapters/
|       +-- src/index.ts
|       +-- src/types.ts
|
+-- infra/
|   +-- docker/docker-compose.yml
|
+-- docs/
    +-- architecture/system-design-overview.md
    +-- architecture/README.md
    +-- onboarding/README.md
```

## 7. Plain-English Client Summary

```text
AuthOS Health sits between clinical staff, payer interactions, and upstream healthcare systems.

The web app gives staff a single workspace for authorizations.
The API is the control layer that applies business logic and stores the truth.
Background workers handle long-running automation like voice extraction and workflow escalation.
External systems such as EHRs, payers, and telephony providers connect into the platform through
well-defined integration paths.
```
