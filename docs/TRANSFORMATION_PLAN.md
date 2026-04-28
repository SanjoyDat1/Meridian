# Repository transformation plan

This document is the **Phase 1** artifact: codebase map, dependency relationships, core behavior, and execution order for a full rebrand/rearchitecture while preserving the insurance-appeal pipeline.

---

## 1. Repository map (source only)

Paths below omit `.venv/`, `cases/` (PHI / generated), and `appeal_strategy_agent/.cache/`.

| Area | Purpose |
|------|---------|
| **`app_backend/`** | FastAPI app: static React shell, job queue, `/api/*` for demo, upload, jobs, history. Imports **`orchestrator.run_pipeline`**. |
| **`frontend/`** | **Meridian** UI: Vite + React + TS + Tailwind (`src/`); production build in **`dist/`**. |
| **`orchestrator/`** | **`run_pipeline.py`** end-to-end pipeline; **`verification.py`** artifact checks; **`golden_cases/*.json`** demo input. |
| **`shared/`** | **`schemas.py`** — canonical JSON contracts (team rule: coordinate changes). |
| **`parser/`** | Denial PDF/TXT extract, classify, **`prompt.py`** (Claude → structured intake). **`main.py`** FastAPI **`/run`**. |
| **`contact_agent/`** | **`resolver.py`** (Claude), **`packet.py`**, **`main.py`** (**`/run`**). |
| **`personal_evidence_agent/`** | Standalone FastAPI + extractors (**`/run`**). **Not called by `run_pipeline`**; golden input embeds personal evidence. |
| **`external_evidence_agent/`** | Mongo retrieval, query plan, **`retrieval.py`**, **`main.py`**. |
| **`appeal_strategy_agent/`** | **`appeal_strategy/`** package: **`api.py`**, **`strategy_engine.py`** (Claude + tool), prompts. |
| **`drafting_agent/`** | Deterministic letter + **`main.py`**. |
| **`appeals_history/`** | Mongo read/write for de-identified appeal records. |
| **`fetch_agents/`** | **Unused.** Reserved directory; use **`agents/`** + **`POST /api/agent-chat`**. |
| **`agents/`** | Anthropic **director**: intent + `run_pipeline` + **`POST /api/agent-chat`** / `python -m agents`. |
| **`sample_inputs/`** | Fixture JSON + sample HTML email. |
| **`docs/`** | This plan (expand with ARCHITECTURE.md etc. as phases complete). |

**Root:** `README.md`, `requirements.app`, `external_evidence_agent/requirements.txt`, `parser/requirements.txt`.

---

## 2. Dependency graph (logical)

```
                    ┌─────────────────┐
                    │   frontend      │
                    │ (Vite/React SPA)│
                    └────────┬────────┘
                             │ fetch /api/*
                             ▼
                    ┌─────────────────┐
                    │  app_backend    │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    parser.prompt      orchestrator.run_pipeline   appeals_history.query
    parser.classify         │
                            ├── contact_agent (resolver + packet)
                            ├── external_evidence_agent.retrieval
                            ├── appeal_strategy (parse_input + strategy_engine)
                            ├── drafting_agent (drafter + packet)
                            ├── orchestrator.verification
                            └── appeals_history.recorder

fetch_agents (deprecated) ──(see agents/)──► README only
```

**Anthropic today:** `parser/prompt.py`, `contact_agent/resolver.py`, `appeal_strategy/strategy_engine.py` (and tests). **No Anthropic** in `external_evidence` (Mongo + rules) or **`drafting_agent/drafter.py`** (template logic from strategy).

---

## 3. Core problem & features

- **Problem:** Turn insurance denial material into a structured **appeal strategy** and **draft appeal letter** with citations/checklists, optionally tracking **appeal history** in Mongo.
- **Features:** Demo pipeline from golden JSON; **upload** denial docs + narrative; **async jobs** + polling; **history API**; optional **per-agent HTTP** servers for microservice mode; **Concierge / director** chat via **`POST /api/agent-chat`**.

---

## 4. User journeys

1. **Demo (UI):** Open app → run demo job → poll job → view letter/strategy/packet mock flow + real API payloads.
2. **Upload (UI):** Select files + narrative → `/api/run-upload-job` → parse (Claude) → merge with golden-shaped defaults → `run_pipeline` → artifacts under `cases/<id>/`.
3. **CLI:** `python -m orchestrator.run_pipeline --case <json>` (Mongo required for external evidence store + history).
4. **Director (chat):** Open SPA → **Director** → `POST /api/agent-chat` for help, demo summary, pasted JSON, or phrases that trigger `run_pipeline` (see `agents/`).

---

## 5. Legacy coordinator removal (internal note)

| Item | Role | Replacement direction |
|------|------|------------------------|
| Legacy chat coordinator under **`fetch_agents/`** | Routed chat to the pipeline | **`agents/`** + **`POST /api/agent-chat`**: Claude-aided intent + `run_pipeline`. No extra vendor env keys. |
| **`fetch_agents/README.md`** | Docs | **`fetch_agents/README.md`** now points to Meridian director usage. |
| **`parser/uagent_wrapper.py`** | Indirect parser forwarding | **Removed** — call **`POST /run`** on the parser service directly. |
| **`uagents`** in requirements | Dependency | **Dropped** once no imports remain. |

**Note:** Browser **`fetch()`** is standard HTTP — unrelated to any retired coordinator service.

---

## 6. “Crafted agents” on Anthropic (design target)

Preserve **JSON contracts** (`shared/schemas.py`) and pipeline stages; re-express each stage as an explicit **agent module** with:

- **`AgentDefinition`**: name, responsibility, input/output Pydantic (or dict + validation), `system_prompt` / tool schema path.
- **`run(agent, payload, callbacks)`**: single entry that calls **`anthropic.Anthropic()`** with one configured model (env: `ANTHROPIC_API_KEY`, optional `COUNTERCLAIM_MODEL`).
- **Director/orchestrator** (`agents/director.py` or extend `orchestrator/run_pipeline.py`): sequential + logged handoffs (`step`, `latency_ms`, `token_usage` if available), same artifact files as today.
- **LLM stages today:** Parser (upload path), Contact resolver, Strategy engine. **Optional enhancement:** Personal evidence enrichment via **`personal_evidence_agent`** prompts inside pipeline (new feature — currently golden-only).

This keeps **one** primary LLM vendor (Anthropic) for those stages while preserving explicit JSON handoffs.

---

## 7. Transformation opportunities (high level)

| Layer | Opportunity |
|-------|-------------|
| **Frontend** | Replace monolithic `index.html` with **Vite + React + TS**, new design system (Tailwind or CSS modules), split components, a11y, proper loading/error empty states. |
| **Backend** | Thin routers vs services; optional **`/api/pipeline-events` SSE** instead of polling; structured typing with Pydantic on API boundaries. |
| **Agents** | Consolidated `agents/` package wrapping Anthropic; optional parallel **internal** workers (asyncio). |
| **Quality** | Central logging; strip `console.log` in new frontend; expand tests for orchestrator + API. |
| **Docs** | Rename product, rewrite README, add ARCHITECTURE.md / API.md after routes stabilize. |

---

## 8. Files that are **not** “code UX” but still in scope

- **`sample_inputs/*.json`**: Update `schema_version` / examples if schemas evolve; add README blurb in `sample_inputs/README.md` (small).
- **`orchestrator/golden_cases/*.json`**: Keep compatible with pipeline; adjust only if intake shape changes.
- **Tests** under `appeal_strategy_agent/appeal_strategy/tests/`: Update imports/paths after moves.

---

## 9. Risk & test checkpoints

1. After agent refactor: **`python -m orchestrator.run_pipeline`** on golden case.
2. After API changes: hit **`/api/run-demo-job`** and **upload** flow.
3. After frontend rebuild: manual responsive + keyboard smoke test.
4. Mongo **external_evidence** + **appeals_history** still required for full parity (or document fallbacks).

---

## 10. Progress tracker

### Phase 1: Analysis
- [x] Repository structure mapped (this document)
- [x] Core functionality & journeys documented
- [x] Anthropic director agent strategy defined
- [x] Transformation order identified

### Phase 2: Frontend
- [x] New stack (**Vite + React + TS + Tailwind**) and **Meridian** design system (Inter + Source Serif 4, navy–teal palette)
- [x] Component split (`src/screens/*`, `src/components/ui/*`), live regions / focus styles, step rails
- [x] **`app_backend`** serves `frontend/dist/index.html` + `/assets`; falls back to `frontend/legacy/original-spa.html` if dist missing
- **Dev:** `cd frontend && npm install && npm run dev` (proxies `/api` → `:8000`)
- **Prod static:** `cd frontend && npm run build` before `uvicorn`

### Phase 3: Agents & director

- [x] `agents/` package: `intent.py`, `pipeline_director.py`, `python -m agents`
- [x] `POST /api/agent-chat` on app backend
- [x] Removed `uagents` from requirements; removed legacy `fetch_agents` coordinator module and **`parser/uagent_wrapper.py`**
- [x] README + `fetch_agents/README.md` aligned with Meridian director usage

### Phase 4: Backend & quality
- [x] **API Pydantic models** (`app_backend/api_models.py`), **`GET /health`**, tagged routes, **`JobQueuedResponse`** on async job creates
- [x] **Tests** (`tests/` + `pytest` in `requirements.app`). *SSE deferred* — poll `/api/jobs/{id}` (see `docs/API.md`).

### Phase 5: Documentation deliverables
- [x] **CHANGELOG.md**
- [x] **ARCHITECTURE.md**
- [x] **CONTRIBUTING.md**
- [x] **docs/API.md**
- [x] **sample_inputs/README.md**

### Phase 6: Director UX + CI
- [x] **Director** screen in SPA (`DirectorChat.tsx`): **`POST /api/agent-chat`**, Ctrl/⌘+Enter, accessible reply region
- [x] **`.github/workflows/ci.yml`**: Python 3.12 + `pytest tests/`; Node 20 + `frontend` `npm ci` / `npm run build`
- [x] API test for **queued** job shape on **`POST /api/run-demo-job`**

### Phase 7: Plan & ops alignment
- [x] Progress tracker and user-journey text match **director + CI** (this document)
- [x] **CONTRIBUTING.md** / **docs/API.md** / **ARCHITECTURE.md** note CI and Director entry from the SPA

### Phase 8: API test hardening
- [x] **`tests/test_api.py`**: unknown **`GET /api/jobs/{id}`** → 404; invalid **`user_preferences`** JSON on **`POST /api/run-upload-job`** → 400; **`GET /openapi.json`** title guard (**Meridian API**)

### Phase 9: Meridian rebrand (ship-ready UI)
- [x] Product name **Meridian**, **Concierge** assistant, professional navy/teal theme, Inter + Source Serif 4, copy and compliance/footer refresh across SPA
- [x] OpenAPI title **Meridian API**; director **`help_text`** uses **Meridian director**

---

## 11. Execution order (recommended)

1. **Anthropic agent layer consolidation** (low UI coupling, immediate goal).
2. **Frontend reboot** (largest visible diff).
3. **README + API.md** aligned with new routes.
4. **CHANGELOG / ARCHITECTURE / CONTRIBUTING** at milestone.

---

*Last updated: through Phase 9 (Meridian rebrand).*
