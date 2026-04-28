"""
Classify free-text chat for the pipeline director.

Fast heuristics first; optional Claude call when the message is ambiguous.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from enum import Enum
from typing import Any

from dotenv import load_dotenv


class IntentKind(str, Enum):
    HELP = "help"
    DEMO_SUMMARY = "demo_summary"
    RUN_DEMO = "run_demo"
    RUN_JSON = "run_json"


@dataclass
class Intent:
    kind: IntentKind
    case_payload: dict[str, Any] | None = None


def _repo_env_loaded() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    load_dotenv(root / "external_evidence_agent" / ".env")


def parse_case_payload(text: str) -> dict[str, Any] | None:
    stripped = text.strip()
    if not stripped.startswith("{"):
        return None
    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) and "case_id" in parsed else None


def should_run_demo(text: str) -> bool:
    normalized = text.lower()
    triggers = ("demo", "sample", "golden", "test case", "run case", "appeal", "pipeline")
    return any(t in normalized for t in triggers)


def classify_intent_heuristic(text: str) -> Intent | None:
    normalized = text.strip().lower()
    if normalized in {"status", "ping", "hello", "help", "what can you do?"}:
        return Intent(IntentKind.HELP)

    if "demo summary" in normalized or "latest demo" in normalized:
        return Intent(IntentKind.DEMO_SUMMARY)

    payload = parse_case_payload(text)
    if payload is not None:
        return Intent(IntentKind.RUN_JSON, case_payload=payload)

    if should_run_demo(text):
        return Intent(IntentKind.RUN_DEMO)

    return None


def classify_intent_with_llm(text: str) -> Intent:
    """Use a tiny Sonnet call when heuristics do not match."""
    import anthropic

    _repo_env_loaded()
    client = anthropic.Anthropic()
    prompt = f"""Classify this user message for an insurance-appeal automation tool.
Return ONLY a minified JSON object with one key "intent" whose value is exactly one of:
help, demo_summary, run_demo, run_json.

Rules:
- If they paste JSON with a case_id field, use run_json (we will parse separately — still use run_demo if only narrative).
- If they want to execute the sample pipeline use run_demo.
- If they ask what ran / latest output use demo_summary.
- Otherwise use help.

User message:
---
{text[:4000]}
---
"""
    raw = (
        client.messages.create(
            model=os.getenv("COUNTERCLAIM_DIRECTOR_MODEL", "claude-sonnet-4-6"),
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        .content[0]
        .text.strip()
    )
    if raw.startswith("```"):
        parts = raw.split("```", 2)
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return Intent(IntentKind.HELP)
    intent_val = data.get("intent", "help")
    mapping = {
        "help": IntentKind.HELP,
        "demo_summary": IntentKind.DEMO_SUMMARY,
        "run_demo": IntentKind.RUN_DEMO,
        "run_json": IntentKind.RUN_JSON,
    }
    kind = mapping.get(str(intent_val).lower(), IntentKind.HELP)
    if kind == IntentKind.RUN_JSON:
        payload = parse_case_payload(text)
        if payload:
            return Intent(IntentKind.RUN_JSON, case_payload=payload)
        return Intent(IntentKind.RUN_DEMO)
    return Intent(kind)


def classify_intent(text: str) -> Intent:
    h = classify_intent_heuristic(text)
    if h is not None:
        return h
    use_llm = os.getenv("COUNTERCLAIM_CHAT_USE_LLM", "1").strip().lower() in {"1", "true", "yes", "on"}
    if not use_llm:
        return Intent(IntentKind.HELP)
    try:
        return classify_intent_with_llm(text)
    except Exception:
        return Intent(IntentKind.HELP)
