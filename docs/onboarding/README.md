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

### Twilio trial setup for live voice

For mock calls only, keep `VOICE_CALL_MODE=mock` in `apps/api/.env`.

For real Twilio calls with live transcript updates in `/voice`:

1. In `apps/api/.env`, set:
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
2. In `apps/worker-voice/.env`, set:
   `WORKER_PUBLIC_URL`, `WORKER_WS_URL`, `STT_API_KEY`
3. Expose the voice worker publicly over `https`/`wss` so Twilio can reach it.
   `WORKER_PUBLIC_URL` should resolve to `https://.../voice/twiml`
   `WORKER_WS_URL` should resolve to `wss://...`
4. In a Twilio trial account, the destination number must be verified first.
5. Restart `apps/api` and `apps/worker-voice` after changing env values.

The dashboard still runs locally on `http://localhost:3000`; only the voice worker needs a public endpoint for Twilio media streaming.

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
