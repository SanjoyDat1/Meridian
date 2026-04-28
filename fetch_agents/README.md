# Legacy integration slot (unused)

This directory is reserved. Meridian routes all chat control through **`agents/`** and **`POST /api/agent-chat`**.

- **CLI:** `python -m agents "run demo case"` from the repository root (with `.env` loaded).
- **HTTP:** `POST /api/agent-chat` with body `{"message": "..."}` on the app backend (default port `8000`).

No third-party coordinator service or extra `FETCH_*` environment variables are required.
