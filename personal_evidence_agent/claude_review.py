"""Claude critical review of personal evidence vs. extraction task (no new clinical facts)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from shared.claude_runtime import anthropic_available, default_model, get_client

SYSTEM = """You are a clinical appeals analyst reviewing **existing** patient-evidence JSON against an extraction task.

Rules:
- Do NOT invent symptoms, dates, providers, or diagnoses not grounded in the provided personal_evidence JSON.
- Identify gaps between what the task asked for and what is present.
- Assess whether the record supports a medical-necessity narrative for appeal (given the denial category).
- Be concise and actionable for downstream strategy agents.

Return ONLY valid JSON (no markdown):
{
  "coverage_of_task": "brief assessment",
  "evidence_gaps": ["gap 1", "gap 2"],
  "strengths_for_appeal": ["point grounded in JSON"],
  "risks_or_weaknesses": ["point"],
  "recommended_focus_for_strategy": "one paragraph"
}
"""


def review_personal_evidence_bundle(
    task: dict[str, Any],
    personal_evidence: dict[str, Any],
) -> dict[str, Any] | None:
    if not anthropic_available():
        return None
    try:
        client = get_client()
        user = json.dumps({"task": task, "personal_evidence": personal_evidence}, indent=2, default=str)
        msg = client.messages.create(
            model=default_model(),
            max_tokens=1200,
            temperature=0,
            system=SYSTEM,
            messages=[{"role": "user", "content": user}],
        )
        raw = next((b.text for b in msg.content if getattr(b, "type", None) == "text"), "").strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.lstrip().startswith("json"):
                raw = raw.lstrip()[4:].lstrip()
        return json.loads(raw)
    except Exception as exc:
        return {
            "error": f"{type(exc).__name__}",
            "message": str(exc),
            "coverage_of_task": "Claude review unavailable; using seeded personal evidence only.",
        }
