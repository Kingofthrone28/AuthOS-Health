# code-style.md

## Purpose

This file defines coding standards for AuthOS-Health and is intended to be referenced by the root `CLAUDE.md`.

## Core principles

* Prefer clear, maintainable code over clever abstractions.
* Optimize for readability, traceability, and safety.
* Keep healthcare workflows auditable and deterministic.
* Isolate external integrations behind adapters.
* Treat PHI-sensitive logic, logging, and data handling as first-class concerns.

## Language and framework defaults

### TypeScript

* Use TypeScript by default for frontend and main backend services.
* Prefer explicit types for exported functions, DTOs, service contracts, and shared domain models.
* Avoid `any`. Use `unknown` when needed and narrow it safely.
* Prefer discriminated unions for workflow states and event types.

### React / Next.js

* Use App Router patterns.
* Prefer Server Components by default.
* Use Client Components only for interactivity, browser APIs, local UI state, or event handlers.
* Keep route files thin. Move data loading and mapping into feature containers.
* Use presentation components for rendering only.
* Keep UI components small and composable.

### Workers (Express.js / TypeScript)

* All workers (`worker-voice`, `worker-workflow`) are Express.js services written in TypeScript.
* Workers import shared types directly from `packages/voice-adapters`, `packages/domain`, etc. — no schema bridge needed.
* Keep worker responsibilities narrow.
* If local model inference is ever needed (e.g., on-device Whisper, fine-tuned NLP), evaluate Python as a sidecar at that point. For API-driven transcription and extraction (Deepgram, AssemblyAI, Claude), TypeScript is preferred.

## Architecture conventions

### Container / presentation pattern

* Containers fetch data, map view models, wire actions, and manage route-level orchestration.
* Presentation components receive props and render UI only.
* Presentation components should not own business rules.

### Atomic design

* **Atoms**: buttons, inputs, badges, cards, icons, text primitives.
* **Molecules**: grouped controls like search fields, status pills, KPI cards, detail rows.
* **Organisms**: tables, filters, panels, nav shells, timelines, summaries.
* Keep feature-specific UI in the feature when reuse is unlikely.
* Keep shared primitives in common component folders.

### Domain boundaries

* Keep these domains isolated:

  * web app
  * API gateway / BFF
  * case service
  * EHR integration
  * requirements engine
  * submission service
  * voice AI service
  * workflow orchestrator
  * document service
  * analytics service
* All payer, EHR, telephony, and storage integrations should go through adapter layers.

## File and folder style

* Prefer feature-based organization over type-only grouping for application code.
* Keep shared contracts in dedicated packages.
* Keep route handlers, queries, actions, and mappers close to their owning feature.
* Use consistent names:

  * `*Container.tsx` for container components
  * `*Page.tsx` for presentational route views
  * `queries.ts` for reads
  * `actions.ts` for writes
  * `types.ts` for local feature types
  * `mappers.ts` for response-to-view-model transforms

## Naming rules

* Use descriptive names.
* Prefer domain language over generic naming.
* Good examples:

  * `AuthorizationCase`
  * `PayerResponse`
  * `VoiceExtractionReview`
  * `buildSubmissionPacket`
* Avoid vague names like:

  * `data`
  * `item`
  * `stuff`
  * `helper`

## React component rules

* Keep components focused on one job.
* Avoid deeply nested JSX when a child component would improve clarity.
* Derive view state from props when possible.
* Keep side effects out of presentational components.
* Use semantic HTML for accessibility.
* Prefer controlled inputs for dashboard filters and search.

## State management

* Prefer server state on the server.
* Use URL state for filters, sort, and shareable dashboard context.
* Use local component state for transient UI only.
* Avoid introducing global client state unless truly necessary.
* Prefer simple composition before adding a state library.

## Data fetching and mutations

* Use server-side data fetching for authenticated dashboards and case detail screens.
* Use dynamic rendering for live operational data.
* Use ISR only for slow-changing shared content.
* Revalidate affected paths or tags after mutations.
* Mutations must produce auditable outcomes.

## API design rules

* Design APIs around domain actions, not generic CRUD alone.
* Prefer explicit endpoints such as:

  * `POST /cases/:id/submit`
  * `POST /cases/:id/escalate`
  * `POST /extracted-events/:id/approve`
* Validate all request payloads.
* Return stable response shapes.
* Version external-facing integration contracts when needed.

## Workflow and event rules

* Model workflow states explicitly.
* Keep state transitions deterministic.
* Use event names that describe facts that happened.
* Good examples:

  * `case.created`
  * `requirements.discovered`
  * `payer.response.received`
  * `voice.event.approved`
* Do not let unreviewed AI output directly perform irreversible actions.

## Logging and audit

* All authorization case changes must be auditable.
* Log business events, not noisy implementation details.
* Never log PHI casually.
* Mask or exclude sensitive fields from logs.
* Keep audit events immutable.

## Security and compliance-aware style

* Default to least privilege.
* Scope access by tenant and role.
* Encrypt PHI in transit and at rest.
* Use structured review states for AI-generated outputs.
* Keep secrets out of source code.
* Treat file uploads, OCR, transcripts, and extracted events as regulated data flows.

## Testing expectations

* Write unit tests for domain logic and state transitions.
* Write integration tests for adapters and service boundaries.
* Write end-to-end tests for critical workflows:

  * create case
  * detect requirements
  * submit auth
  * process payer response
  * review voice extraction
* Add regression tests for denial, appeal, and stalled payer edge cases.

## Code review checklist

Before merging, check that:

* naming is clear
* types are explicit where needed
* business logic is not buried in UI
* adapters isolate external dependencies
* mutations emit audit-friendly results
* logs do not expose sensitive data
* component boundaries are clean
* route files are thin
* tests cover the main workflow and edge cases

## Formatting and style consistency

* Use consistent linting and formatting across the repo.
* Prefer short functions with obvious intent.
* Break complex logic into named helpers or domain services.
* Add comments only when they explain why, not what.
* Prefer straightforward control flow over clever chaining.

## Anti-patterns to avoid

* fat route files
* business logic inside JSX
* direct EHR or payer calls from UI components
* untyped integration payloads
* silent workflow failures
* hidden side effects in utility functions
* broad shared helpers with unclear ownership

## Recommended import into CLAUDE.md

Reference this file from the root `CLAUDE.md` under a section such as:

* Coding standards
* Engineering conventions
* Code review expectations
