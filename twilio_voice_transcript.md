# Twilio Voice Transcript Capture Spec

## Goal

Wire real-time phone-call audio into the existing Voice AI pipeline so completed calls produce transcripts, extracted authorization events, and dashboard review items.

The first production-shaped milestone should be:

```text
Twilio Media Streams
  -> worker WebSocket
  -> streaming speech-to-text
  -> final transcript text
  -> existing API transcript persistence
  -> existing event extraction
  -> existing voice dashboard
```

This keeps the current extraction and review flow intact while adding live call capture as the new ingestion layer.

## Current State

The existing pipeline already handles completed transcripts after `apps/worker-voice` posts them to the API:

- `apps/worker-voice/src/services/extractionService.ts` extracts authorization events from transcript text.
- `apps/worker-voice/src/routes/transcript.ts` posts completed transcripts and extracted events to the API.
- `apps/api/src/services/voiceService.ts` persists transcripts, extracted events, review tasks, stats, and review decisions.
- `apps/api/src/routes/voice.ts` exposes transcript, pending event, stats, and review endpoints.
- `apps/web/src/features/voice/` renders stats, transcript feed, review queue, and auto-refresh.

The missing piece is a real-time audio ingestion path that creates transcript text from an actual phone call.

## Recommended First Integration

Use Twilio Media Streams for phone-call audio capture.

Twilio can stream call audio over WebSocket to a worker endpoint. The worker should bridge Twilio audio frames into a streaming speech-to-text provider, collect final transcript segments, and then call the existing transcript persistence and extraction flow when the call completes.

## Proposed Architecture

```text
Caller / payer phone call
  -> Twilio Programmable Voice
  -> Twilio Media Stream WebSocket
  -> apps/worker-voice WebSocket endpoint
  -> streaming STT provider
  -> final transcript segment buffer
  -> apps/api voice transcript endpoint
  -> Claude extraction via worker
  -> apps/api extracted event endpoint
  -> dashboard read path
```

## New Worker Capability

Add a WebSocket endpoint to `apps/worker-voice`, for example:

```text
WS /voice/twilio-media
```

Responsibilities:

- Accept Twilio Media Stream WebSocket connections.
- Parse Twilio stream lifecycle messages:
  - `connected`
  - `start`
  - `media`
  - `stop`
- Track the Twilio call/session identifiers, especially `CallSid` and `StreamSid`.
- Decode or forward Twilio media payloads into the selected streaming STT provider.
- Receive partial and final transcript results.
- Buffer final transcript segments in call order.
- On call end, assemble the completed transcript.
- Post the completed transcript to the existing API flow.
- Run extraction and forward extracted events to the API, matching the current completed-transcript path.

## Speech-to-Text Provider

Pick a provider with streaming transcription support. Good candidates:

- Deepgram streaming
- AssemblyAI real-time
- Google Speech-to-Text streaming
- Azure Speech
- OpenAI Realtime/transcription APIs, if the project standardizes on OpenAI for this layer

For the first pass, prefer whichever provider has the simplest Node streaming SDK and supports Twilio's audio format cleanly.

Twilio Media Streams commonly sends audio as base64-encoded mulaw frames. The worker should either:

- send mulaw frames directly if the STT provider supports it, or
- transcode to the provider's required format before forwarding.

## API Shape

The current API can persist completed transcripts, but real-time calls benefit from explicit call lifecycle endpoints.

Recommended API additions:

```text
POST /voice/transcripts/start
POST /voice/transcripts/:id/segments
POST /voice/transcripts/:id/complete
```

### `POST /voice/transcripts/start`

Creates a transcript shell when the call starts.

Suggested payload:

```json
{
  "externalCallId": "CA...",
  "externalStreamId": "MZ...",
  "source": "twilio",
  "status": "IN_PROGRESS",
  "caller": "+15551234567",
  "callee": "+15557654321",
  "patientId": "optional-known-patient-id",
  "caseId": "optional-known-case-id"
}
```

### `POST /voice/transcripts/:id/segments`

Persists final transcript segments as they arrive. This is optional for the first implementation if the dashboard only needs completed transcripts.

Suggested payload:

```json
{
  "sequence": 12,
  "startedAtMs": 42100,
  "endedAtMs": 46800,
  "speaker": "unknown",
  "text": "The authorization number is A12345.",
  "isFinal": true
}
```

### `POST /voice/transcripts/:id/complete`

Marks the call transcript complete and stores final transcript text.

Suggested payload:

```json
{
  "durationSeconds": 311,
  "transcriptText": "Full assembled transcript text...",
  "completedAt": "2026-04-10T18:42:00.000Z"
}
```

After completion, the worker can reuse the existing extraction logic and event-forwarding path.

## Data Model Considerations

The first version can store only completed transcript text in the existing `CallTranscript` model.

If live captions or better auditability are needed, add a transcript segment table later:

```text
CallTranscriptSegment
  id
  tenantId
  transcriptId
  sequence
  startedAtMs
  endedAtMs
  speaker
  text
  isFinal
  createdAt
```

Suggested additions to `CallTranscript`, if not already present:

- `externalCallId`
- `externalStreamId`
- `source`
- `status`
- `startedAt`
- `completedAt`
- `durationSeconds`

Use `externalCallId` for idempotency when Twilio retries or reconnects.

## Extraction Strategy

Start with completion-based extraction:

1. Stream and buffer final transcript segments during the call.
2. On Twilio `stop`, assemble the transcript.
3. Persist the completed transcript.
4. Run Claude extraction against the full transcript.
5. Persist extracted events through the existing API endpoint.

This avoids deduping partial findings and keeps the review queue behavior predictable.

After the base capture path is stable, add incremental extraction:

- Run extraction every N seconds against a rolling window of final segments.
- Mark live findings as provisional.
- Dedupe by event type, reference number, status, missing document, and transcript span.
- Finalize or discard provisional events when the call completes.

## Dashboard Strategy

The current voice dashboard can keep working with completed transcripts.

For the first version:

- Show completed transcripts after the call ends.
- Keep the existing 15-second auto-refresh.
- Optionally show `IN_PROGRESS` transcript rows if transcript shells are persisted at call start.

For live captioning later:

- Persist final segments as they arrive.
- Add an API read endpoint for transcript segments.
- Use SSE or WebSocket updates from the web app to the API.
- Keep polling as a fallback.

## Twilio Setup

Create a Twilio Voice webhook that returns TwiML connecting the call to the media stream.

Example TwiML shape:

```xml
<Response>
  <Start>
    <Stream url="wss://YOUR_WORKER_HOST/voice/twilio-media" />
  </Start>
  <Dial>+15551234567</Dial>
</Response>
```

The exact TwiML depends on whether the app is:

- receiving inbound calls,
- placing outbound calls to payers,
- joining an agent and payer call,
- or recording both sides of a conference.

Decide early whether the stream needs inbound audio only, outbound audio only, or both tracks.

## Configuration

Add environment variables for the worker:

```text
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WEBHOOK_SECRET=
STT_PROVIDER=
STT_API_KEY=
API_BASE_URL=
API_INTERNAL_TOKEN=
```

If Twilio request validation is used for the WebSocket upgrade path, document the exact validation method and any reverse proxy requirements.

## Error Handling

The worker should handle:

- Twilio reconnects or duplicate `start` messages.
- STT provider disconnects.
- Audio payload decode/transcode errors.
- API persistence failures.
- Extraction failures after transcript completion.

Minimum reliable behavior:

- Do not lose the full buffered transcript if extraction fails.
- Mark the transcript complete even if extraction fails.
- Log enough Twilio identifiers to replay or debug the call.
- Make transcript completion idempotent by `externalCallId`.

## Milestones

1. Add Twilio-facing worker WebSocket endpoint.
2. Add streaming STT client abstraction.
3. Buffer final transcript segments and assemble completed transcript text.
4. Persist completed transcript through the existing API path.
5. Trigger existing Claude extraction after call completion.
6. Persist extracted events through the existing API path.
7. Add transcript `IN_PROGRESS` or Twilio metadata fields if needed.
8. Update dashboard only if live/in-progress transcript display is required.
9. Add integration tests with recorded Twilio media payload fixtures.
10. Configure Twilio webhook/TwiML in the target environment.

## Smallest Useful Build

The smallest useful build is:

```text
Twilio Media Stream
  -> worker WebSocket
  -> Deepgram or similar streaming STT
  -> assembled transcript on stop
  -> existing completed transcript POST
  -> existing extraction POST
  -> current dashboard
```

This gets real call capture working without changing the review queue, dashboard data model, or extraction approval rules.
