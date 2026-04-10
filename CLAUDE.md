# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for the full product spec, component design, API surface, data model, and working conventions.

## Commands

```bash
# Install all workspace dependencies
npm install

# Dev (all apps with hot reload)
npm run dev

# Dev (single app)
npm run dev -w apps/api
npm run dev -w apps/web
npm run dev -w apps/worker-voice
npm run dev -w apps/worker-workflow

# Build all
npm run build

# Build a single package or app
npm run build -w packages/shared-types
npm run build -w apps/api

# Type check
npm run type-check

# Lint
npm run lint

# Test all
npm test

# Test single package
npm test -w packages/domain
```

## Local infrastructure

```bash
# Start Postgres + Redis
docker compose -f infra/docker/docker-compose.yml up postgres redis -d
```

See [docs/onboarding/README.md](docs/onboarding/README.md) for full setup including env vars and service ports.

## Monorepo structure

```
apps/
  web/               Next.js dashboard (TypeScript, App Router)
  api/               API Gateway / BFF (Express.js)
  worker-voice/      Voice AI webhook worker (Express.js)
  worker-workflow/   Workflow orchestrator (Express.js)
packages/
  shared-types/      All entity interfaces and enums — import first
  domain/            State machine, SLA logic, voice policy, domain events
  audit/             AuditEmitter interface
  fhir-adapters/     FHIR R4 types and mappers
  payer-adapters/    Submission packet types and PayerAdapter interface
  voice-adapters/    Webhook payload types and TelephonyAdapter interface
infra/
  docker/            Dockerfiles and docker-compose for local dev
  github-actions/    CI pipeline
  helm/              Self-hosted Helm chart (Phase 4)
  terraform/         Cloud infrastructure (Phase 3)
docs/
  onboarding/        Local dev setup and service port reference
  architecture/      ADRs and component diagrams
  api/               OpenAPI spec and endpoint guides
  security/          Tenant isolation, PHI handling, RBAC
```

## Key conventions

- `packages/domain` has zero runtime external dependencies — it imports only from `packages/shared-types`
- All apps import shared types directly from `packages/*` — no schema bridge
- Route files in `apps/web` are thin: parse params, mount containers, set Suspense boundaries
- Containers fetch data; presentation components render props only
- Every case mutation must emit an `AuditEvent` via `@authos/audit`
- Unreviewed AI extractions must never directly mutate irreversible case state
