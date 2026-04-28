"""Post-retrieval critical analysis of external evidence (Mongo citations only)."""
from __future__ import annotations

import json
from typing import Any

from shared.claude_runtime import anthropic_available, default_model, get_client

SYSTEM = """You critique **retrieved** policy/CMS evidence for a health insurance appeal.

Inputs: the external_evidence_task and a compact summary of retrieved citations (titles, source types, short quotes only as given).

Rules:
- Do NOT invent citations, URLs, or policy text not present in the payload.
- Rank which retrieved pieces are strongest for rebutting a typical medical-necessity denial.
- Call out corpus gaps (missing NCD/LCD, thin insurer policy hits, etc.).

Return ONLY valid JSON:
{
  "retrieval_assessment": "2-4 sentences",
  "strongest_citation_ids": ["ext-cite-001"],
  "weakest_or_irrelevant": ["id or title"],
  "coverage_gaps": ["what is missing from corpus perspective"],
  "suggested_argument_threads": ["thread 1", "thread 2"],
  "confidence_in_corpus_for_case": 0.0
}
`confidence_in_corpus_for_case` is a number 0-1.
"""


def critique_external_bundle(task_json: dict[str, Any], citations_brief: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not anthropic_available():
        return None
    try:
        client = get_client()
        payload = {"task": task_json, "citations": citations_brief[:20]}
        msg = client.messages.create(
            model=default_model(),
            max_tokens=1200,
            temperature=0,
            system=SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": json.dumps(payload, indent=2, default=str),
                }
            ],
        )
        raw = next((b.text for b in msg.content if getattr(b, "type", None) == "text"), "").strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.lstrip().startswith("json"):
                raw = raw.lstrip()[4:].lstrip()
        return json.loads(raw)
    except Exception as exc:
        return {
            "error": type(exc).__name__,
            "message": str(exc),
            "retrieval_assessment": "Claude critique skipped or failed.",
        }


def citations_brief_for_critique(citations: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for c in citations:
        if hasattr(c, "model_dump"):
            d = c.model_dump(mode="json")
        else:
            d = dict(c)
        cit = d.get("citation") or {}
        out.append(
            {
                "citation_id": d.get("citation_id"),
                "source_type": d.get("source_type"),
                "title": d.get("title"),
                "quote": (d.get("quote") or "")[:400],
                "relevance_score": d.get("relevance_score"),
                "citation_label": cit.get("citation_label"),
            }
        )
    return out
