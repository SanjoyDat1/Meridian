# Meridian

**Meridian** is a clinical appeals workspace: an AI-assisted pipeline that reads insurance denials and produces structured appeal drafts. The **web UI** (Vite + React) is served by the app backend; orchestration stays in Python. **Concierge** chat (`agents/` + `POST /api/agent-chat`, Anthropic-backed) provides natural-language control over the same pipeline.

---

## How It Works

```
  [ Denial Letter / Upload ]
           │
           ▼
    App Backend (8000)          serves the Meridian UI & manages async job queue
           │
           ▼
        Parser                  structures the raw denial document
           │
           ▼
  ┌────────┼────────┐
  │        │        │           ← parallel
Contact  Personal  External
 Agent   Evidence  Evidence
(8002)   (8003)    (8004)
  │        │        │
  └────────┬────────┘
           │
           ▼
  Appeal Strategy Agent (8005)  Claude: synthesizes denial + all evidence
           │
           ▼
    Drafting Agent (8006)       writes the final appeal letter
           │
           ▼
  [ Appeal Letter + Exhibits ]
```

Each agent is an independent FastAPI service. They communicate exclusively via JSON. The orchestrator wires them together end-to-end (via direct imports, not HTTP).

---

## Agents & Ports

| Agent | Port | Endpoint | Input | Output |
|---|---|---|---|---|
| `app_backend` | 8000 | `POST /api/run-demo-job`, `POST /api/run-upload-job`, **`POST /api/agent-chat`** | See endpoints | Job events + artifacts; chat director reply |
| `parser` | 8001 | `POST /run` | Raw denial document | `denial_intake.json` |
| `contact_agent` | 8002 | `POST /run` | `missing_info_request.json` | `contact_actions.json` |
| `personal_evidence_agent` | 8003 | `POST /run` | `personal_evidence_task.json` + optional docs | `personal_evidence.json` |
| `external_evidence_agent` | 8004 | `POST /run` | `external_evidence_task.json` | `external_evidence.json` (MongoDB citations) |
| `appeal_strategy_agent` | 8005 | `POST /strategy` | `denial_intake` + `personal_evidence` + `external_evidence` + `contact_actions` | `appeal_strategy.json` |
| `drafting_agent` | 8006 | `POST /run` | `appeal_strategy.json` | Final appeal letter + exhibits checklist |

---

## Anthropic chat director (`agents/`)

Configure **your Anthropic API key** in `external_evidence_agent/.env` (loaded by the orchestrator).

- **HTTP:** `POST /api/agent-chat` with JSON `{"message": "run demo case"}` → `{"reply": "..."}`.
- **SPA:** Use **Concierge** on the landing view.
- **CLI (repo root):** `python -m agents "demo summary"` (MongoDB and other keys as needed for a full run).

Heuristics handle `help`, `demo summary`, pasted golden JSON, and obvious “run demo” phrases. Set `COUNTERCLAIM_CHAT_USE_LLM=0` to skip an extra Claude call for ambiguous text. Optional: `COUNTERCLAIM_DIRECTOR_MODEL` (default `claude-sonnet-4-6`).

## Documentation

- **[docs/API.md](docs/API.md)** — HTTP routes and request/response models.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — system layout and data flow.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — setup, tests, conventions.
- **[CHANGELOG.md](CHANGELOG.md)** — release notes.

## Quickstart

### 1. Environment

From the **repository root**:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.app
cp external_evidence_agent/.env.example external_evidence_agent/.env
# Edit external_evidence_agent/.env: MONGODB_URI, ANTHROPIC_API_KEY, etc.
```

### 2. Frontend build

```bash
cd frontend && npm install && npm run build && cd ..
```

### 3. Run the app backend

Still from the **repository root** (required for imports):

```bash
source .venv/bin/activate
python3 -m uvicorn app_backend.main:app --reload --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000** for the built UI, or run **`cd frontend && npm run dev`** and use **http://localhost:5173** with the API proxied to port 8000.

### Chat director CLI

```bash
cd /path/to/repo
source .venv/bin/activate
python -m agents "run demo case"
```

### Run an individual agent

```bash
uvicorn main:app --reload --port <YOUR_PORT>
```

Use the port from the table above. For `appeal_strategy_agent`:

```bash
cd appeal_strategy_agent
uvicorn appeal_strategy.api:app --reload --port 8005
```

---

## JSON schema contract

Every JSON message passed between agents **must** include:

```json
{
  "case_id": "string",
  "schema_version": "string",
  "status": "string",
  "provenance": {}
}
```

The canonical source of truth for schemas is **`shared/schemas.py`**. Coordinate changes across agents when updating it.

---

## API contract

Each agent should expose:

- **`POST /run`** — input JSON → output JSON  
- **`GET /health`** — e.g. `{"status": "ok"}`  

Exception: **`appeal_strategy_agent`** uses **`POST /strategy`** and **`POST /strategy/validate`**.

---

## Project rules

- **Never commit `.env`** or **`cases/`** (PHI).
- **Do not modify `shared/schemas.py`** without updating dependents and tests.
- Pass JSON between agents — not ad hoc file drops.
- Include `case_id`, `schema_version`, `status`, and `provenance` on JSON outputs where applicable.

---

## Sample inputs

The **`sample_inputs/`** directory has example JSON per stage for isolated agent testing.

---

## Stack

- **Python 3.11+**
- **FastAPI** — HTTP servers
- **Anthropic Claude** (`claude-sonnet-4-6` default) — LLM for parser, strategy, drafting, and optional orchestration assists
- **MongoDB** — evidence retrieval (`MONGODB_DB`, default **`counterclaim`**) and appeals history
- **Vite + React 18** — Meridian UI (`frontend/` → `frontend/dist/`)
- **PyMuPDF** — PDF text extraction (with regex fallback)
- **Pydantic** — validation via `shared/schemas.py`
