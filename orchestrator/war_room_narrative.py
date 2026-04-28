"""Per-phase War Room narratives: Claude synthesis with deterministic fallback (no API key)."""
from __future__ import annotations

import json
import os
import time
from typing import Any

from shared.claude_runtime import anthropic_available, default_model, get_client


def skip_llm_narrative() -> bool:
    return os.getenv("WAR_ROOM_SKIP_NARRATIVE", "").strip().lower() in ("1", "true", "yes")


def narrative_pause() -> None:
    try:
        ms = int(os.getenv("WAR_ROOM_NARRATIVE_PAUSE_MS", "450"))
    except ValueError:
        ms = 450
    if ms > 0:
        time.sleep(ms / 1000.0)


def _clip(s: str, n: int = 900) -> str:
    s = (s or "").strip()
    if len(s) <= n:
        return s
    return s[: n - 1] + "…"


def _mini(obj: Any, max_chars: int = 5200) -> str:
    try:
        raw = json.dumps(obj, indent=2, default=str)
    except Exception:
        raw = str(obj)
    if len(raw) > max_chars:
        return raw[: max_chars - 30] + "\n…(truncated)"
    return raw


PERSONA_BLURBS = {
    "seed_golden_artifacts": (
        "Rowan · Intake analyst",
        "You normalize carrier-facing denial artifacts into a verified JSON contract—the canonical spine every later agent trusts.",
    ),
    "personal_evidence_agent": (
        "Soren · Clinical evidence reviewer",
        "You stress-test structured patient facts against the extraction task to see whether the clinical story can bear medical-necessity pressure.",
    ),
    "contact_agent": (
        "Ellis · Correspondence lead",
        "You translate missing-field analysis into a precise outreach plan so the file is complete before policy and strategy arguments harden.",
    ),
    "external_evidence_agent": (
        "Jules · Policy corpus curator",
        "You translate retrieval intents into a defensible citation set that strategy can cite without over-claiming.",
    ),
    "appeal_strategy_input": (
        "Mira · Strategy integrator",
        "You validate that intake, clinical facts, outreach, and citations can be composed into one coherent argument contract.",
    ),
    "appeal_strategy_agent": (
        "Dante · Strategy synthesizer",
        "You weave the merged facts into a ranked remedy path and explicit argument chain the drafter must execute.",
    ),
    "drafting_agent_letter": (
        "Naomi · Appeal drafter",
        "You convert the strategy into patient-safe, citation-aware letter prose while preserving deadlines and exhibits discipline.",
    ),
    "drafting_agent_packet": (
        "Naomi · Packet assembler",
        "You lock the letter into a submission packet with exhibits scaffolding appropriate to the channel.",
    ),
    "verification": (
        "Vera · Verification auditor",
        "You independently check that claims, citations, and structural artifacts align before the case leaves the pipeline.",
    ),
}


def _fallback_narrative(step: str, bundle: dict[str, Any]) -> str:
    d = bundle.get("denial_intake") or {}
    ins = d.get("insurer") or "the carrier"
    reason = _clip(str(d.get("denial_reason_text") or ""), 400)
    codes = d.get("denied_procedure_codes") or []
    icd = d.get("diagnosis_codes") or []
    pe = bundle.get("personal_evidence") or {}
    syms = pe.get("symptoms") or []
    prv = bundle.get("pe_review") or {}
    gap_txt = ""
    if isinstance(prv, dict):
        gap_txt = _clip(str(prv.get("recommended_focus_for_strategy") or prv.get("coverage_of_task") or ""), 500)

    if step == "seed_golden_artifacts":
        return (
            f"I sealed the intake spine for {ins}. The denial narrative cites: \"{reason}\" when reduced to its operative core. "
            f"Procedure focus {codes[:5] or '—'} and diagnosis hooks {icd[:5] or '—'} are now normalized for every downstream specialist. "
            "I am treating the structured JSON as the single source of truth—any ambiguity in original documents is flagged for correspondence rather than silently guessed. "
            "Handoff: Soren should now interrogate whether the seeded clinical facts actually answer the carrier's medical-necessity frame."
        )

    if step == "personal_evidence_agent":
        sym_line = "; ".join(str(x) for x in syms[:4]) if syms else "limited symptom enumeration in bundle"
        tail = f" Claude review notes: {gap_txt}" if gap_txt else ""
        return (
            "I compared the structured record against the personal-evidence extraction mandate. "
            f"The salient clinical signals I am carrying forward are: {sym_line}. "
            "I looked for internal consistency between treating-physician statements, timelines, and functional limitations implied by the denial category."
            f"{tail} "
            "Handoff: Ellis should calibrate outreach asks so we close evidentiary gaps without surrendering appeal timelines."
        )

    ca = bundle.get("contact_actions") or {}
    outreach = ""
    if isinstance(ca, dict):
        ed = ca.get("email_draft")
        if isinstance(ed, dict):
            outreach = _clip(str(ed.get("body") or ed.get("subject") or ed), 400)
        elif ed:
            outreach = _clip(str(ed), 400)
    if step == "contact_agent":
        return (
            "I derived the smallest set of carrier-facing requests that unblock strategy—not a laundry list. "
            "Each ask maps to a field the parser flagged or the clinical reviewer marked thin. "
            f"Draft scaffolding (redacted tone check): {_clip(outreach, 350) or 'contact_actions JSON prepared for outreach tooling.'} "
            "Handoff: Jules must now assume these asks are in flight and build policy retrieval that does not depend on facts we have not yet secured."
        )

    ext = bundle.get("external_evidence") or {}
    cites = []
    if isinstance(ext, dict):
        data = ext.get("data") or {}
        cites = data.get("citations") or ext.get("citations") or []
    if step == "external_evidence_agent":
        return (
            f"I curated {len(cites)} external citation candidates aligned to the denial category and insurer lens. "
            "I prioritized sources that speak directly to medical necessity rather than generic plan marketing language. "
            "Where Mongo or retrieval returned thin matches, I annotated weakness so strategy does not over-weight weak authority. "
            "Handoff: Mira must fold citations with clinical facts and outreach posture before Dante commits to a remedy ranking."
        )

    warns = bundle.get("strategy_warnings") or []
    if step == "appeal_strategy_input":
        wtxt = "; ".join(str(w) for w in warns[:6]) if warns else "contract self-consistent"
        return (
            "I validated the inputs for appeal_strategy: denial intake, clinical facts, correspondence posture, and policy citations. "
            f"Contract diagnostics: {wtxt}. "
            "Where warnings remain, I expect Dante to surface them explicitly in the argument chain rather than burying them in confident prose. "
            "Handoff: Dante now owns remedy selection and the ordered argument sequence."
        )

    strat = bundle.get("strategy") or {}
    remedy = strat.get("agent_recommended_remedy") or strat.get("recommended_remedy")
    if step == "appeal_strategy_agent":
        args = strat.get("argument_chain") or []
        arg0 = _clip(str(args[0].get("claim")) if args and isinstance(args[0], dict) else "", 320)
        return (
            f"I committed to remedy posture {remedy or 'full_overturn / TBD'} based on the merged evidence. "
            f"Lead argument theme: {arg0 or 'structured in appeal_strategy.json'}. "
            "I pressure-tested whether the clinical record and citations can jointly sustain that claim—not merely whether each alone looks strong. "
            "Handoff: Naomi must draft in the patient's voice with footnotes anchored to this strategy, not freelancing new legal theories."
        )

    if step == "drafting_agent_letter":
        letter = bundle.get("draft_letter_excerpt") or ""
        return (
            "I translated the strategy into an appeal letter skeleton that keeps deadlines, remedy ask, and exhibit hooks explicit. "
            f"Opening leverage text: {_clip(letter, 520) or 'see drafted_letter.json for full body.'} "
            "I avoided introducing facts absent from intake or clinical bundles; anything that sounds novel is either quoted strategy language or clearly labeled as patient narrative. "
            "Handoff: packet assembly should preserve exhibit ordering that matches citation footnotes."
        )

    if step == "drafting_agent_packet":
        return (
            "I wrapped the letter with a disciplined exhibit map so reviewers can trace each assertion to an attachment. "
            "Submission instructions emphasize channel-appropriate filing and preservation of appeal clocks. "
            "Handoff: Vera verifies structural alignment before we treat the artifacts as final."
        )

    ver = bundle.get("verification_status") or "unknown"
    if step == "verification":
        return (
            f"I ran cross-artifact verification and recorded status {ver}. "
            "I checked for citation drift between strategy and letter, exhibit duplication, and whether denial identifiers stay consistent throughout. "
            "Any residual risk is noted for human counsel—not hidden behind an 'success' flag. "
            "Handoff: operational owners may now export the packet; clinicians should sanity-check PHI before external send."
        )

    return (
        f"Completed pipeline step {step} with bundled artifacts. "
        "Downstream agents should treat JSON artifacts on disk as authoritative for this case run."
    )


def _llm_narrate(step: str, bundle: dict[str, Any], output_hint: str) -> str | None:
    if skip_llm_narrative() or not anthropic_available():
        return None
    persona = PERSONA_BLURBS.get(step)
    if not persona:
        return None
    codename_role, voice = persona
    context_obj: dict[str, Any] = {
        "denial_intake": bundle.get("denial_intake"),
        "personal_evidence": bundle.get("personal_evidence"),
        "pe_review": bundle.get("pe_review"),
        "contact_actions": bundle.get("contact_actions"),
        "external_evidence": bundle.get("external_evidence"),
        "strategy_warnings": bundle.get("strategy_warnings"),
        "strategy_excerpt": bundle.get("strategy"),
        "verification_status": bundle.get("verification_status"),
    }
    user = (
        f"Step: {step}\n"
        f"Persona: {codename_role}\n"
        f"Voice: {voice}\n\n"
        "Context excerpts (JSON):\n"
        f"{_mini({k: v for k, v in context_obj.items() if v is not None})}\n\n"
        f"What this step produced (hints): {output_hint}\n\n"
        "Write four to six dense paragraphs of first-person expert reasoning for a War Room operator. "
        "Explain what you observed, how prior agents' outputs influenced you, what uncertainty remains, and a closing "
        '"Handoff:" sentence naming the next specialist and their priority. '
        "Do not fabricate facts beyond the JSON. Plain text only—no markdown headings."
    )
    try:
        client = get_client()
        msg = client.messages.create(
            model=default_model(),
            max_tokens=1400,
            temperature=0.35,
            system=(
                "You write live operational narratives for a clinical insurance appeals command center. "
                "Be substantive, specific, and cautious with clinical/legal claims."
            ),
            messages=[{"role": "user", "content": user}],
        )
        return _clip(
            next((b.text for b in msg.content if getattr(b, "type", None) == "text"), "").strip(),
            4500,
        )
    except Exception:
        return None


def build_phase_narrative(step: str, bundle: dict[str, Any], output_hint: str = "") -> str:
    """Return a long-form narrative for the War Room UI; uses Claude when configured."""
    text = _llm_narrate(step, bundle, output_hint)
    narrative_pause()
    if text:
        return text
    return _fallback_narrative(step, bundle)
