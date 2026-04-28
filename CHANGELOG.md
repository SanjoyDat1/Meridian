# Changelog

All notable changes to **Meridian** are recorded here.

## [Unreleased]

### Added
- **Meridian** frontend: Vite, React 18, TypeScript, Tailwind (`frontend/`); production build served from `frontend/dist/`.
- **`agents/`** package: chat director with heuristic + optional Claude intent routing; CLI `python -m agents`.
- **`POST /api/agent-chat`**, **`GET /health`**, OpenAPI-tagged routes.
- **`app_backend/api_models.py`**: Pydantic request/response models for agent chat, jobs, health.
- **`tests/`**: pytest suite for intent heuristics and API smoke tests (`pytest tests/`).
- **Concierge** SPA (landing entry) calling **`POST /api/agent-chat`**; Ctrl/⌘+Enter to send.
- **GitHub Actions** **`.github/workflows/ci.yml`**: Python pytest + frontend `npm ci` / `npm run build`.
- Documentation: **`ARCHITECTURE.md`**, **`CONTRIBUTING.md`**, **`docs/API.md`**.
- **API regression tests**: unknown **`GET /api/jobs/{id}`** → 404; invalid **`user_preferences`** JSON on **`POST /api/run-upload-job`** → 400; **`GET /openapi.json`** asserts app title **Meridian API**.
- **`GET /api/demo-case`**: bundled golden JSON metadata + preview for the Upload screen.
- **Pipeline Claude layers**: personal evidence review artifact; external evidence query intents default to **Anthropic** when **`ANTHROPIC_API_KEY`** is set; post-retrieval **`claude_critical_review`** on **`external_evidence` data**; contact **`critical_thinking`** block; drafting **`submit_letter_draft`** tool (fallback deterministic letter); verification **`claude_quality_review`**; shared **`shared/claude_runtime.py`**.

### Changed
- App OpenAPI title to **Meridian API**; job endpoints return structured **`JobQueuedResponse`** (same JSON keys).
- **Full product rebrand** to **Meridian**: navy / teal design system, Inter + Source Serif 4, professional copy; chat assistant labeled **Concierge**; backend help text aligned.
- **`POST /api/run-demo`** body: prefer `{"user_preferences": { ... }}` (still accepts `{}`).
- **`docs/TRANSFORMATION_PLAN.md`**: Phases 6–8 (Director UI, CI, doc alignment, API test hardening); user journey #4 is director chat.
- **CONTRIBUTING** / **docs/API.md** / **ARCHITECTURE.md** / **README**: Node 20 to match CI; SPA **Concierge** and workflow references.

### Removed
- Legacy third-party chat coordinator modules under **`fetch_agents/`** and **`parser/uagent_wrapper.py`**.
- **`uagents`** dependency from Python requirement sets.

### Fixed
- **CLI `orchestrator.run_pipeline`**: load `.env` before Mongo `ping` in `main()`.
- **Local Mongo**: `MongoEvidenceStore` only uses TLS CA bundle for `mongodb+srv` / explicit TLS URIs.

### Not planned (yet)
- **SSE** for job progress (clients continue to poll **`GET /api/jobs/{job_id}`**).
