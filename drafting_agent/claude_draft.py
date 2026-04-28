"""Claude drafting with forced tool call; falls back via caller."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from shared.claude_runtime import anthropic_available, default_model, get_client

DRAFT_DIR = Path(__file__).resolve().parent
PROMPTS_DIR = DRAFT_DIR / "prompts"
TOOL_PATH = PROMPTS_DIR / "draft_tool.json"
SYSTEM_PATH = PROMPTS_DIR / "draft_system.txt"


def _load_tool() -> dict[str, Any]:
    return json.loads(TOOL_PATH.read_text(encoding="utf-8"))


def _load_system() -> str:
    return SYSTEM_PATH.read_text(encoding="utf-8").strip()


def try_claude_draft(strategy: dict[str, Any]) -> dict[str, Any] | None:
    if not anthropic_available():
        return None
    try:
        tool = _load_tool()
        system = _load_system()
        if tool.get("name") != "submit_letter_draft":
            return None
        client = get_client()
        payload = json.dumps(strategy, indent=2, default=str)
        if len(payload) > 95000:
            payload = payload[:95000] + "\n…[truncated for context limit]…"

        msg = client.messages.create(
            model=default_model(),
            max_tokens=6000,
            temperature=0,
            system=system,
            tools=[tool],
            tool_choice={"type": "tool", "name": "submit_letter_draft"},
            messages=[{"role": "user", "content": f"Strategy JSON:\n{payload}"}],
        )
        tool_use = next((b for b in msg.content if getattr(b, "type", None) == "tool_use"), None)
        if tool_use is None:
            return None
        out = dict(tool_use.input)
        note = (out.get("generation_note") or "").strip()
        out["generation_note"] = (note + " | Claude Sonnet (tool submit_letter_draft).").strip(" |")
        return out
    except Exception:
        return None
