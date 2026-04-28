"""
Director: maps chat intents to orchestrator.run_pipeline and human-readable summaries.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from agents.intent import IntentKind, classify_intent, parse_case_payload

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CASE_PATH = REPO_ROOT / "orchestrator" / "golden_cases" / "pt_tibia_rehab_case.json"


def _ensure_sys_path() -> None:
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))


def summarize_pipeline_result(result: dict[str, Any]) -> str:
    artifacts = result.get("artifacts", {})
    status_log = result.get("status_log", [])
    completed_steps = [entry.get("step") for entry in status_log if entry.get("status")]

    lines = [
        "Appeal pipeline completed.",
        f"Case ID: {result.get('case_id', 'unknown')}",
        f"Pipeline status: {result.get('status', 'unknown')}",
        f"Verification status: {result.get('verification_status', 'unknown')}",
    ]

    if completed_steps:
        lines.append("Executed steps: " + ", ".join(str(s) for s in completed_steps if s))

    important = [
        "external_evidence",
        "appeal_strategy",
        "drafted_letter",
        "appeal_packet",
        "verification_report",
    ]
    available = [f"{name}: {artifacts[name]}" for name in important if name in artifacts]
    if available:
        lines.append("Key artifacts:")
        lines.extend(f"- {item}" for item in available)

    lines.append("Review artifacts under cases/<case_id>/ before filing.")
    return "\n".join(lines)


def latest_demo_summary() -> str | None:
    result_path = REPO_ROOT / "cases" / "demo-pt-tibia-001" / "pipeline_result.json"
    if not result_path.exists():
        return None
    try:
        return summarize_pipeline_result(json.loads(result_path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError):
        return None


def help_text() -> str:
    return (
        "Meridian director (Anthropic + local orchestrator).\n\n"
        "Try:\n"
        "- status — this message\n"
        "- demo summary — last demo-pt-tibia-001 result from disk\n"
        "- run demo case — full pipeline from golden JSON\n"
        "- Paste a full golden case JSON (must include case_id)\n\n"
        "Unset COUNTERCLAIM_CHAT_USE_LLM=0 to skip Claude for ambiguous phrasing.\n"
        "Web UI: POST /api/agent-chat with JSON {\"message\": \"...\"}."
    )


def run_director_from_text(text: str) -> str:
    intent = classify_intent(text)

    if intent.kind == IntentKind.HELP:
        return help_text()

    if intent.kind == IntentKind.DEMO_SUMMARY:
        summary = latest_demo_summary()
        if summary:
            return summary
        return "No local demo artifacts yet. Send: run demo case"

    load_dotenv(REPO_ROOT / "external_evidence_agent" / ".env")
    _ensure_sys_path()
    from orchestrator.run_pipeline import load_json, run_pipeline

    if intent.kind == IntentKind.RUN_JSON:
        case_payload = intent.case_payload or parse_case_payload(text) or load_json(DEFAULT_CASE_PATH)
    else:
        case_payload = load_json(DEFAULT_CASE_PATH)

    result = run_pipeline(case_payload)
    return summarize_pipeline_result(result)


def reply_to_message(text: str) -> str:
    """Public entry: one chat turn → reply string."""
    text = (text or "").strip()
    if not text:
        return help_text()
    try:
        return run_director_from_text(text)
    except Exception as exc:
        return f"Pipeline error: {type(exc).__name__}: {exc}"
