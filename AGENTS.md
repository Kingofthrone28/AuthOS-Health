# Repository Guidelines

## Project Structure & Module Organization

This is an npm workspaces monorepo managed with Turbo. Applications live in `apps/`: `web` (Next.js dashboard), `api` (Express BFF), `worker-voice`, `worker-workflow`, and local mock FHIR, CRD, and payer services. Reusable TypeScript code belongs in `packages/`: domain rules, shared types, audit, FHIR, payer, and voice adapters. Prisma schema and migrations are in `apps/api/prisma/`; deployment assets are under `infra/`; documentation is in `docs/`.

Keep route handlers thin and put business behavior in the relevant API service. Follow the existing web feature structure (`containers/`, `presentation/`, `mappers.ts`, and `types.ts`).

## Build, Test, and Development Commands

```bash
npm install
docker compose -f infra/docker/docker-compose.yml up postgres redis -d
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npm run dev                 # start all workspaces through Turbo
npm run build               # build all apps and packages
npm run type-check          # strict TypeScript checks
npm run lint                # ESLint across workspaces
npm test                    # run all Jest suites
npm test -w apps/api        # run one workspace's tests
```

Use `npm run dev -w <workspace>` for one service. Node `>=20` and npm `10.9.2` are expected.

## Coding Style & Naming Conventions

Use strict TypeScript, 2-space indentation, semicolons, and the repository's ESLint configuration. Prefer named types and domain enums over string literals. Use `camelCase` for variables/functions, `PascalCase` for React components/classes, and service filenames such as `caseService.ts`. Validate DTOs with Zod and preserve tenant scoping in every data access path.

## Testing Guidelines

Tests use Jest with `ts-jest`; colocate them near the implementation or in `__tests__/`. Name files `*.test.ts` or `*.test.tsx`. Cover state transitions, authorization boundaries, service side effects, and adapter mappings. Run the affected workspace test, then `npm test`, `npm run type-check`, and `npm run lint` before a PR.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects, optionally scoped to a workspace (for example, `@authos/api:test` or `fix web lint action`). PRs should explain the behavior change, list validation commands, link an issue, and include UI screenshots when relevant. Call out migrations, environment variables, deployment changes, and security or PHI impact.

## Security & Configuration

Never commit secrets, real patient data, payer credentials, or production exports. Use `.env` files locally and mock services for development. Every API query and mutation must enforce authenticated tenant/org boundaries; do not add header-only tenant bypasses. Redact PHI from logs and audit payloads, and add or update audit events when changing case, submission, task, or access behavior.

## Inherited Repository Rules

The canonical rule sources are `.claude/rules/code-style.md`, `dashboard.md`, `phase_two.md`, `phase_two_ehr_voice.md`, `testing.md`, and `twilio_voice_transcript.md`. Their working requirements are:

- Prefer readable, deterministic TypeScript with explicit exported types, no `any`, discriminated workflow states, short functions, and adapters around payer, EHR, telephony, storage, and model providers. Keep web routes thin; containers fetch/map data and presentation components render props only. Use Server Components by default and client boundaries only for interaction, browser APIs, or local state.
- Keep domain boundaries separate: web, API/BFF, case, requirements, submissions, voice, workflow, documents, analytics, and integrations. Use domain-action APIs such as `POST /cases/:id/submit`, validate every payload, return stable shapes, and make mutations auditable. Never allow unreviewed AI output to perform irreversible actions.
- Treat all case transitions, payer responses, requirements, task changes, voice reviews, and access decisions as high-risk. Preserve tenant and role authorization, immutable audit history, PHI-safe logs, encryption in transit/at rest, and synthetic fixtures only.
- Test in layers: unit tests for domain logic and mappers; integration tests for services, databases, adapters, and queues; contract tests for FHIR, payer, voice, and internal events; and E2E tests for case creation, requirements, submission, payer response, voice review, escalation, denial, and appeal. Name suites `*.test.ts`, `*.integration.test.ts`, `*.contract.test.ts`, or `*.e2e.test.ts` and test duplicate delivery, timeouts, malformed payloads, retryability, and permission failures.
- Phase 2 integration contracts remain in force: persistence uses Prisma/Postgres, CRD/DTR and FHIR use adapter/mock boundaries, shared types/domain packages own contracts and state rules, and API services own side effects. Do not move business logic into route handlers or UI components.
- For Twilio voice, use the worker WebSocket path `WS /voice/twilio-media`, track `CallSid`/`StreamSid`, buffer ordered final STT segments, complete transcripts idempotently by external call ID, preserve transcripts when extraction fails, and reuse the existing persistence and human-review flow. Keep provider secrets in environment configuration and validate webhook authenticity.

Before merging, check route/container boundaries, adapter isolation, explicit state transitions, tenant scoping, audit coverage, PHI redaction, accessibility for UI changes, and the relevant workflow/error-path tests.
