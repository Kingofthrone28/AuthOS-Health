# testing.md

## Purpose

This file defines testing conventions for AuthOS-Health and is intended to be referenced by the root `CLAUDE.md`.

The goal is to make healthcare workflow changes safe, auditable, and regression-resistant across the monorepo.

## Testing principles

- Test business-critical workflows first.
- Prefer deterministic tests over fragile mocks.
- Validate domain behavior, not only implementation details.
- Treat workflow state changes, payer responses, and AI review flows as high-risk paths.
- Every irreversible or user-visible workflow change should be covered by automated tests.

## Testing layers

### 1. Unit tests
Use unit tests for:
- pure domain logic
- state machines
- SLA calculations
- mapper functions
- validation logic
- helper functions with clear inputs and outputs

Examples:
- `AuthorizationCase` status transitions
- denial reason normalization
- deadline calculation for standard vs expedited requests
- voice extraction confidence threshold rules

### 2. Integration tests
Use integration tests for:
- service boundaries
- database-backed workflows
- adapter behavior
- queue / orchestrator behavior
- API handlers with real validation and persistence layers

Examples:
- case creation writes audit events
- requirements discovery persists `AuthorizationRequirement` rows
- submission service stores external reference and payer response
- document upload produces attachment metadata

### 3. Contract tests
Use contract tests for:
- EHR / FHIR adapters
- payer adapters
- voice webhook payloads
- internal event payloads between services

These tests should verify:
- required fields
- type shape
- backward compatibility where relevant
- mapping correctness between external and internal models

### 4. End-to-end tests
Use end-to-end tests for the most important user workflows.

Minimum required E2E scenarios:
- create a new authorization case
- discover requirements
- complete missing documentation
- submit prior authorization
- receive payer response
- review voice extraction
- escalate stalled case
- process denial and start appeal

### 5. Non-functional tests
Add targeted non-functional coverage for:
- auth / permission boundaries
- audit logging behavior
- performance of queue and dashboard queries
- retry behavior under integration failure
- file upload / OCR edge cases

## Required workflow coverage

The following flows should always have automated coverage before release:

### Authorization flow
- clinician starts a case
- requirements are discovered
- missing docs are surfaced
- packet is submitted
- payer response updates case state

### Voice AI flow
- transcript arrives
- extraction event is generated
- low-confidence event is routed to human review
- approved event updates the case
- rejected event does not mutate final case state

### Denial / appeal flow
- denial reason is stored
- case transitions to denied
- appeal task chain is created
- supporting documentation is attached
- resubmission path works

### Tenant and access flow
- user can only access authorized tenant data
- role-based restrictions are enforced
- unauthorized mutation attempts fail safely

## Monorepo testing conventions

### apps/web
Focus on:
- component rendering
- accessibility-sensitive interactions
- route-level loading and error states
- filter and URL-state behavior
- critical dashboard workflows

Prefer:
- component tests for presentational UI
- integration tests for container + route behavior
- E2E tests for critical case flows

### apps/api
Focus on:
- request validation
- response contracts
- authorization rules
- orchestration endpoints
- server actions and mutation behavior

### apps/worker-workflow
Focus on:
- retries
- delayed callbacks
- escalation rules
- idempotency
- event ordering

### apps/worker-voice
Express.js / TypeScript service. Focus on:
- transcript parsing
- event extraction normalization
- confidence threshold routing
- fallback and retry logic
- webhook payload validation against `packages/voice-adapters` types

### packages/domain
This package should have the strongest unit test coverage.

Test:
- state transitions
- policy rules
- SLA logic
- event naming
- domain validation

### adapter packages
Each adapter should have:
- integration tests
- contract tests
- failure-mode coverage

## Naming and structure

Use consistent test file naming:
- `*.test.ts` for unit tests
- `*.integration.test.ts` for integration tests
- `*.contract.test.ts` for contract tests
- `*.e2e.test.ts` for end-to-end tests

Suggested structure:

```txt
apps/
  api/
    src/
    tests/
  web/
    src/
    tests/
packages/
  domain/
    src/
    tests/
  fhir-adapters/
    src/
    tests/
```

## Test data conventions

- Use realistic healthcare workflow fixtures without real PHI.
- Never use production patient data.
- Prefer synthetic but believable payer, case, and transcript fixtures.
- Keep fixtures small and readable.
- Store reusable fixtures close to the owning domain.

Recommended fixture types:
- patient reference
- coverage / payer plan
- service request
- requirements response
- payer denial response
- transcript with extracted event candidates
- approval / rejection review payloads

## Mocking rules

- Mock only true external boundaries.
- Do not mock domain logic under test.
- Prefer fake adapters over deep mock chains.
- Avoid asserting internal implementation details that make refactors brittle.

Mock these boundaries when appropriate:
- telephony providers
- transcription providers
- external payer APIs
- EHR sandbox endpoints
- object storage

## Assertions to prefer

Prefer assertions on:
- final state
- persisted records
- emitted events
- audit trail entries
- user-visible outcomes

Avoid overfitting tests to:
- exact internal call counts unless behavior depends on them
- incidental markup structure
- private helper behavior through fragile mocks

## Error-path expectations

Every critical service should test at least:
- timeout from external dependency
- malformed payload from external dependency
- duplicate event delivery
- retryable failure
- non-retryable failure
- permission denied
- missing required data

## AI and voice-specific testing

Because this product includes AI-assisted workflows, test these explicitly:

- extraction confidence thresholds
- approved vs rejected review paths
- deterministic normalization of extracted events
- transcript chunk ordering
- missing field handling
- human handoff creation
- prevention of direct irreversible mutation from unreviewed AI output

## Audit and compliance testing

Every mutation that changes a case should verify:
- audit event exists
- actor is captured when applicable
- before/after state is recorded where required
- tenant scoping is preserved
- sensitive values are not leaked into logs accidentally

## Performance-sensitive areas

Add targeted performance checks for:
- dashboard work queue queries
- case detail page loading
- analytics aggregation jobs
- large attachment metadata reads
- workflow retry bursts

These do not need to be full benchmark suites at first, but they should exist for known hot paths.

## Release gate expectations

Before release, ensure:
- core authorization flow passes
- core voice review flow passes
- denial/appeal flow passes
- tenant access checks pass
- audit tests pass
- adapter contract tests pass for changed integrations

## Code review checklist for tests

Before merging, confirm:
- the test covers behavior that matters
- the naming is clear
- fixtures are readable
- no real PHI is used
- external dependencies are mocked only at the boundary
- state transitions are asserted explicitly
- audit behavior is covered for important mutations

## Recommended import into CLAUDE.md

Reference this file from the root `CLAUDE.md` under a section such as:

- Testing standards
- Testing conventions
- Release quality checks
