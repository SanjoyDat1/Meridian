# Contributing

## Prerequisites

- **Python 3.11+** (3.13 ok with current stack).
- **Node 20+** for the frontend (matches **`.github/workflows/ci.yml`**).
- **MongoDB** for full pipeline (evidence + appeal history).

## Setup

```bash
cd /path/to/meridian   # your local project root
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.app
cp external_evidence_agent/.env.example external_evidence_agent/.env
# Edit .env: MONGODB_URI, ANTHROPIC_API_KEY
cd frontend && npm install && npm run build && cd ..
```

## Run

```bash
source .venv/bin/activate
cd /path/to/meridian   # repository root — required for imports
python3 -m uvicorn app_backend.main:app --reload --host 127.0.0.1 --port 8000
```

If another process uses port `8000`, choose another port (e.g. `8010`).

Frontend dev (HMR):

```bash
cd frontend && npm run dev
```

## Tests

```bash
pytest tests/ -q
```

On **push** / **pull_request** to `main` or `master`, **GitHub Actions** runs the same pytest plus **`frontend`** `npm ci` and **`npm run build`** (see **`.github/workflows/ci.yml`**).

## Conventions

- Prefer **small, focused PRs**; avoid drive-by refactors.
- Do **not** commit `.env` or `cases/` (PHI).
- Coordinate updates to **`shared/schemas.py`** with any code that consumes those shapes.
- Match existing style: type hints, explicit HTTP errors for user-facing failures.

## Concierge / chat

- Heuristics live in **`agents/intent.py`**; optional LLM routing uses the same **`ANTHROPIC_API_KEY`**.
- Disable extra Claude call: `COUNTERCLAIM_CHAT_USE_LLM=0` in `.env`.
