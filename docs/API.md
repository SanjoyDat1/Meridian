# Meridian HTTP API

Base URL: `http://127.0.0.1:8000` (default uvicorn). OpenAPI schema: **`/docs`**.

## Meta

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{"status": "ok"}` — load balancer / probe. |
| GET | `/api/demo-case` | **`DemoCaseInfo`** — bundled golden JSON (`orchestrator/golden_cases/pt_tibia_rehab_case.json`), summary + preview. |

## Agents (chat director)

The Meridian SPA exposes **Concierge** (landing header) calling this endpoint. Same contract as direct HTTP below.

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/agent-chat` | `AgentChatRequest` | `AgentChatResponse` |

### `AgentChatRequest`

```json
{
  "message": "run demo case"
}
```

Either **`message`** or **`text`** (alias) may be set. Omitted or empty → help-style reply.

### `AgentChatResponse`

```json
{
  "reply": "Appeal pipeline completed.\nCase ID: …"
}
```

**Intents (heuristic):** `help` / `status`, `demo summary`, pasted JSON with **`case_id`**, phrases suggesting demo run. Ambiguous input may call Claude when **`COUNTERCLAIM_CHAT_USE_LLM`** is not disabled.

## Jobs

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/run-demo-job` | `UserPreferencesPayload` | `JobQueuedResponse` |
| POST | `/api/run-upload-job` | `multipart/form-data`: `files[]`, `patient_narrative`, `user_preferences` (JSON string) | `JobQueuedResponse` |
| GET | `/api/jobs/{job_id}` | — | Job snapshot (`status`, `events`, `result`, …) |

### `UserPreferencesPayload`

```json
{
  "user_preferences": {
    "desired_outcome": "full",
    "desired_outcome_label": "Full overturn"
  }
}
```

Empty `{}` is valid; omitting `user_preferences` defaults to `{}`.

### `JobQueuedResponse`

```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

Poll **`GET /api/jobs/{job_id}`** until `status` is `success` or `failed`.

## Synchronous demo

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/run-demo` | `UserPreferencesPayload` | Full case payload (same shape as job `result`). |

## History

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/api/history` | `limit`, `offset` | `status`, `cases`, `records` (or `unavailable`). |
| GET | `/api/history/{case_id}` | — | Single record. |

## Latest demo artifacts

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/latest` | Bundled JSON for fixed demo case id. |
| GET | `/api/latest/letter.txt` | Plain-text appeal letter. |

## Static UI

| Method | Path | Notes |
|--------|------|------|
| GET | `/` | `frontend/dist/index.html` if built; else legacy HTML. |
| GET | `/assets/*` | Vite build assets. |

## SSE / streaming

**Not implemented.** Clients should poll **`/api/jobs/{job_id}`**. A future version could add **`GET /api/jobs/{id}/events` (SSE)** without breaking existing clients.
