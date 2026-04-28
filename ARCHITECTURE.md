# Architecture

## Product split

| Layer | Responsibility |
|--------|----------------|
| **Frontend** (`frontend/`) | **Meridian** SPA: intake → posture → pipeline console → letter. Calls FastAPI under `/api/*`. |
| **App backend** (`app_backend/`) | FastAPI app: static UI, async job queue, history, **agent chat** director entrypoint. |
| **Orchestrator** (`orchestrator/run_pipeline.py`) | Single in-process pipeline (contact → external evidence → strategy → drafting → verification → history). |
| **Agents director** (`agents/`) | Chat intent → `run_pipeline` or help/summary (Anthropic optional for ambiguous text). |
| **Standalone services** (`parser/`, `*_agent/`) | Optional FastAPI microservices on separate ports; not required when using app backend + orchestrator imports. |

## Data flow (happy path)

1. User uploads denial (or runs demo) → `/api/run-upload-job` or `/api/run-demo-job`.
2. Background thread runs `run_pipeline` (and parser on upload path first).
3. Client polls **`GET /api/jobs/{job_id}`** for `events` and final `result`.
4. Artifacts persist under **`cases/<case_id>/`** (gitignored; may contain PHI).

Parallel path: **`POST /api/agent-chat`** runs the director, which may invoke **`run_pipeline`** synchronously for demo/JSON intents.

## Configuration

- **`external_evidence_agent/.env`** (loaded by backend orchestrator): `MONGODB_*`, `ANTHROPIC_API_KEY`, optional `COUNTERCLAIM_CHAT_USE_LLM`, `COUNTERCLAIM_DIRECTOR_MODEL`.
- **Frontend**: `frontend/.env` not required for demo; Vite proxy targets `:8000` in dev.

## MongoDB

- **Evidence DB** (default name from **`MONGODB_DB`**, often `counterclaim` in existing deployments): collections such as `evidence_chunks` for external evidence retrieval.
- **`appeal_history`** DB: de-identified appeal records for **`/api/history`**.

## JSON contracts

Canonical shapes live in **`shared/schemas.py`**. Agent JSON should include `case_id`, `schema_version`, `status`, `provenance` where applicable.

## Testing

```bash
source .venv/bin/activate
pip install -r requirements.app
pytest tests/ -q
```

CI (see **`.github/workflows/ci.yml`** on `main` / `master`): Python **pytest** and **`frontend`** production **`npm run build`**.
