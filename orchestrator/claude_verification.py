"""Optional Claude narrative on top of deterministic verification."""
from __future__ import annotations

import json
from typing import Any

from shared.claude_runtime import anthropic_available, default_model, get_client

SYSTEM = """You are a senior appeals QA reviewer. You receive a structured verification report (JSON) that was produced by deterministic checks over claim references, contract violations, and draft footnotes.

Rules:
- Do not contradict the machine findings; **extend** them with qualitative judgment.
- Flag hallucination risk, over-strong language, or missing human review steps.
- Keep JSON-only output, no markdown.

Return ONLY valid JSON:
{
  "executive_summary": "3-5 sentences for a lawyer or patient advocate",
  "top_risks": ["risk 1"],
  "human_review_checklist": ["item"],
  "suggested_edits_to_draft": ["non-binding suggestion"],
  "readiness": "not_ready | needs_review | likely_ready"
}
`readiness` must be one of those three strings.
"""


def enrich_verification_report(report: dict[str, Any]) -> dict[str, Any]:
    if not anthropic_available():
        report["claude_quality_review"] = {
            "skipped": True,
            "reason": "ANTHROPIC_API_KEY not set",
        }
        return report
    try:
        client = get_client()
        slim = {
            "case_id": report.get("case_id"),
            "status": report.get("status"),
            "summary": report.get("summary"),
            "recommendations": (report.get("recommendations") or [])[:12],
            "strategy_claims_preview": [
                {k: x.get(k) for k in ("claim_index", "claim", "status") if isinstance(x, dict)}
                for x in (report.get("strategy_claims") or [])[:4]
            ],
            "contract_violations_preview": [
                {k: x.get(k) for k in ("violation_index", "status", "clause") if isinstance(x, dict)}
                for x in (report.get("contract_violations") or [])[:4]
            ],
        }
        msg = client.messages.create(
            model=default_model(),
            max_tokens=1500,
            temperature=0,
            system=SYSTEM,
            messages=[{"role": "user", "content": json.dumps(slim, indent=2, default=str)}],
        )
        raw = next((b.text for b in msg.content if getattr(b, "type", None) == "text"), "").strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.lstrip().startswith("json"):
                raw = raw.lstrip()[4:].lstrip()
        report["claude_quality_review"] = json.loads(raw)
    except Exception as exc:
        report["claude_quality_review"] = {
            "error": type(exc).__name__,
            "message": str(exc),
        }
    return report
