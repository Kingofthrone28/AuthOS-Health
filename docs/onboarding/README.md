# Onboarding

## Local Development Setup

### Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres and Redis)

### Start the stack

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start Postgres and Redis
docker compose -f infra/docker/docker-compose.yml up postgres redis -d

# 3. Run all apps in dev mode (with hot reload via Turborepo)
npm run dev

# Or run a single app
npm run dev -w apps/api
npm run dev -w apps/web
```

### Environment variables

Copy `.env.example` to `.env` in each app directory and fill in the values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker-voice/.env.example apps/worker-voice/.env
cp apps/worker-workflow/.env.example apps/worker-workflow/.env
```

### Run tests

```bash
# All packages
npm test

# Single package
npm test -w packages/domain
```

### Type check and lint

```bash
npm run type-check
npm run lint
```

## SMART on FHIR Sandbox

TODO: document EHR sandbox configuration (SMART launch URL, client credentials, test patient IDs).

## Service ports

| Service | Port |
|---|---|
| apps/web | 3000 |
| apps/api | 3001 |
| apps/worker-voice | 3002 |
| apps/worker-workflow | 3003 |
| Postgres | 5432 |
| Redis | 6379 |
